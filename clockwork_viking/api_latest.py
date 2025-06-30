from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Union, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import json
import asyncio
import openai
from itertools import product
import os
import io
import pandas as pd
import PyPDF2
from contextlib import asynccontextmanager
import concurrent.futures

from datetime import datetime, timedelta
import logging
import httpx


from docx import Document
from url_scraper import URLScraper
from fastapi.middleware.cors import CORSMiddleware
from skyvern import Skyvern
# For chatbots
import requests
from langchain_openai import ChatOpenAI
from langchain.agents import (
    AgentExecutor,
    create_openai_functions_agent,
)
from langchain.tools import StructuredTool
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Data Pipeline System", version="1.0.0", redirect_slashes=True)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load variables from .env into environment
load_dotenv()

# MongoDB client - you'll need to set your connection string
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "pipeline_db"
COLLECTION_NAME = "data_objects"
PROMPT_COLLECTION_NAME = "prompts"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]
prompt_collection = db[PROMPT_COLLECTION_NAME]

# OpenAI client - set your API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Skyvern with API key
# You should set your API key as an environment variable for security
skyvern_api_key = os.getenv("SKYVERN_API_KEY")

# Initialize Skyvern client
skyvern_client = Skyvern(api_key=skyvern_api_key)

# set up webhook stuff for the internet-research functions
webhook_base_url = os.getenv("API_URL", "https://staging.impromptu-labs.com")
# In-memory storage for research tasks/Skyvern (we could use a database in production)
pending_tasks: Dict[str, Dict] = {}
completed_tasks: Dict[str, Dict] = {}


# Dependency function to extract and validate the input token
async def get_user_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Handle "Bearer token" format
    if authorization.startswith("Bearer "):
        token = authorization[7:]  # Remove "Bearer " prefix
    else:
        token = authorization
    
    # Add token validation logic here if needed
    # if not is_valid_token(token):
    #     raise HTTPException(status_code=401, detail="Invalid token")
    
    return token


async def check_prompt_and_tokens(description, prompt_text):
    try:
        split_tokens = description.split('__-__')
        session_UID = split_tokens[0]
        userId = split_tokens[1]
        return UID, userId
    except Exception as e:
        return None, None
    
# Pydantic models
class DataEntry(BaseModel):
    key_list: List[str]
    value: str
    summary_value: Optional[str] = None

class DataObject(BaseModel):
    object_name: str
    data: List[DataEntry]

class InputDataRequest(BaseModel):
    created_object_name: str
    data_type: str  # 'files', 'strings', or 'urls'
    input_data: List[Any]  # Can be strings, file data, or URLs

class InputSpec(BaseModel):
    input_object_name: str
    mode: str  # 'combine_events', 'use_individually', or 'match_keys'

class ApplyPromptRequest(BaseModel):
    created_object_names: List[str]
    prompt_string: str
    inputs: List[InputSpec]

class RecordProjectRequest(BaseModel):
    session_uid: str
    user_api_key: str
    user_name: str
    user_id: str
    project_id: int
    task_id: Optional[str] = None
    prompt_string: Optional[str] = None
    
# Chatbots and Agents
class CreateAgentRequest(BaseModel):
    instructions: str
    agent_name: Optional[str] = None

class ChatRequest(BaseModel):
    agent_id: str
    message: str

class ChatResponse(BaseModel):
    agent_id: str
    response: str
    conversation_id: Optional[str] = None

class AgentInfo(BaseModel):
    agent_id: str
    agent_name: str
    instructions: str
    created_at: str
    
class ResearchTopicRequest(BaseModel):
    goal: str
    return_data: List[str]
    
# class ResearchTopicResponse(BaseModel):
#     output_data: Dict[str, Any]
#     status: str
    
class ResearchTopicResponse(BaseModel):
    task_id: str
    status: str
    output_data: Optional[str] = None
    message: str
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class WebhookPayload(BaseModel):
    task_id: str
    status: str
    output: Optional[Dict] = None
    error: Optional[str] = None
    
    
## CHATBOTS AND AGENT STUFF
# Global storage for agents (TODO: store these as doc-store elements too)
agents_storage: Dict[str, Any] = {}


@app.post("/record_project")
async def record_project(
    request: RecordProjectRequest,
    user_token: str = Depends(get_user_token)
):
    print(f"🔍 Starting record_project function")
    print(f"📥 Received request: {request}")
    print(f"🔑 User token: {user_token}")
    
    try:
        print(f"📝 Creating project record document...")
        
        # Create the document to upsert
        project_record = {
            "session_uid": request.session_uid,
            "user_api_key": request.user_api_key,
            "user_name": request.user_name,
            "user_id": request.user_id,
            "project_id": request.project_id,
            "user_token": user_token,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print(f"📋 Base project record created: {project_record}")
        
        # Add task_id only if provided
        if request.task_id is not None:
            print(f"➕ Adding task_id to record: {request.task_id}")
            project_record["task_id"] = request.task_id
        else:
            print(f"⏭️ No task_id provided, skipping")
            
        # Add prompt_string only if provided
        if request.prompt_string is not None:
            print(f"➕ Adding prompt_string to record: {request.prompt_string}")
            project_record["prompt_string"] = request.prompt_string
        else:
            print(f"⏭️ No prompt_string provided, skipping")
            
        print(f"📄 Final project record: {project_record}")
        
        # Define the filter for upsert (you can adjust this based on your needs)
        # This example uses project_id and user_id as the unique identifier
        filter_criteria = {
            "project_id": request.project_id,
            "user_id": request.user_id
        }
        
        print(f"🔍 Filter criteria for upsert: {filter_criteria}")
        print(f"🚀 Performing upsert operation...")
        
        # Remove created_at from the project_record before upsert
        project_record_for_set = project_record.copy()
        project_record_for_set.pop("created_at", None)  # Remove created_at if it exists
        
        # Perform upsert operation
        result = await prompt_collection.update_one(
            filter_criteria,
            {
                "$set": project_record_for_set,
                "$setOnInsert": {"created_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        print(f"✅ Upsert operation completed")
        print(f"📊 Result: {result}")
        print(f"🆔 Upserted ID: {result.upserted_id}")
        print(f"🔢 Modified count: {result.modified_count}")
        print(f"🔢 Matched count: {result.matched_count}")
        
        # Return appropriate response
        if result.upserted_id:
            print(f"🆕 New document created with ID: {result.upserted_id}")
            response = {
                "message": "Project record created successfully",
                "project_id": request.project_id,
                "document_id": str(result.upserted_id),
                "action": "created"
            }
            print(f"📤 Returning creation response: {response}")
            return response
        else:
            print(f"🔄 Existing document updated")
            response = {
                "message": "Project record updated successfully",
                "project_id": request.project_id,
                "action": "updated"
            }
            print(f"📤 Returning update response: {response}")
            return response
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        print(f"❌ Exception type: {type(e)}")
        print(f"🚨 Raising HTTPException...")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record project: {str(e)}"
        )

class SimplifiedAgentBuilder:
    def __init__(self, llm_model="gpt-4.1-mini", base_url="http://localhost:5000"):
    # def __init__(self, llm_model="gpt-4.1-mini", base_url="http://staging.impromptu-labs.com:5000"):
        self.llm = ChatOpenAI(model=llm_model, temperature=0.3)
        self.base_url = base_url
        self.default_tools = self._create_default_tools()
        self.api_tools = []

    def register_api_endpoint_as_tool(
        self,
        endpoint_path: str,
        method: str,
        description: str,
        request_model: Optional[BaseModel] = None,
        tool_name: Optional[str] = None
    ) -> Tool:
        """Register an existing API endpoint as a LangChain Tool"""

        if tool_name is None:
            tool_name = f"{method.lower()}_{endpoint_path.strip('/').replace('/', '_').replace('-', '_')}"

        def api_tool_function(*args, **kwargs) -> str:
            def make_request():
                try:
                    # Handle both positional and keyword arguments
                    # If we get positional args, try to parse as JSON or use as single param
                    request_kwargs = kwargs.copy()  # Make a copy to avoid modifying original
                    
                    if args:
                        if len(args) == 1 and isinstance(args[0], str):
                            try:
                                # Try to parse as JSON first
                                print('Trying to parse as json...')
                                parsed = json.loads(args[0])
                                if isinstance(parsed, dict):
                                    request_kwargs.update(parsed)
                            except (json.JSONDecodeError, ValueError):
                                print(f"Got an error, tool name: {tool_name}")
                                # If not JSON, treat as a single parameter
                                # For research_topic, assume it's the 'goal'
                                if 'research_topic' in tool_name:
                                    request_kwargs['goal'] = args[0]
                                    print(f'kwargs of goal is: {request_kwargs["goal"]}')
                                    if 'return_data' not in request_kwargs:
                                        request_kwargs['return_data'] = ['general_information']
                                else:
                                    # For other endpoints, use as generic input
                                    request_kwargs['input'] = args[0]
                    
                    url = f"{self.base_url}{endpoint_path}"
                    response = None
                    method_upper = method.upper()
                    print(f"\nCalling up endpoint: {url}\nWith kwargs:{request_kwargs}\nWith Method:{method_upper}")

                    if method_upper == "GET":
                        response = requests.get(url, params=request_kwargs, timeout=30)
                    elif method_upper == "POST":
                        response = requests.post(url, json=request_kwargs, timeout=30)
                    elif method_upper == "PUT":
                        response = requests.put(url, json=request_kwargs, timeout=30)
                    elif method_upper == "DELETE":
                        response = requests.delete(url, params=request_kwargs, timeout=30)
                    else:
                        return f"Unsupported HTTP method: {method}"

                    if response.status_code == 200:
                        try:
                            return json.dumps(response.json(), indent=2)
                        except Exception:
                            return response.text
                    else:
                        return f"API call failed: {response.status_code} - {response.text}"

                except Exception as e:
                    return f"API error: {str(e)}"
            
            # Run the request in a separate thread to avoid blocking the main event loop
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(make_request)
                    return future.result(timeout=30)  # 30 second timeout
            except concurrent.futures.TimeoutError:
                return f"Request timed out after 30 seconds"
            except Exception as e:
                return f"Thread execution error: {str(e)}"
        
        
        
        tool = Tool.from_function(
            func=api_tool_function,
            name=tool_name,
            description=description,
            args_schema=request_model if request_model else None,
        )
        self.api_tools.append(tool)
        return tool

    def _create_default_tools(self) -> list[Tool]:
        """Create default toolset (e.g., search, math)"""

        def search_internet(query: str) -> str:
            return f"Search results for '{query}' (stubbed). Replace with real API."

        def calculate(expression: str) -> str:
            try:
                allowed_chars = set('0123456789+-*/.() ')
                if not all(c in allowed_chars for c in expression):
                    return "Invalid characters in expression"
                result = eval(expression)
                return str(result)
            except Exception as e:
                return f"Calculation error: {str(e)}"
        return []
        # return [
        #     Tool.from_function(
        #         func=search_internet,
        #         name="search_internet",
        #         description="Search the internet for information given a query string."
        #     ),
        #     Tool.from_function(
        #         func=calculate,
        #         name="calculate",
        #         description="Perform basic math given a string expression like '2 + 2'"
        #     )
        # ]

    def create_agent(self, instructions: str, agent_name: Optional[str] = None) -> tuple[str, AgentExecutor]:
        """Build a new LLM agent with tools and memory"""

        agent_id = agent_name or str(uuid.uuid4())

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"{instructions}\nAlways be helpful, accurate, and use tools when needed."),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])

        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            max_token_limit=2000
        )

        tools = self.default_tools + self.api_tools

        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=tools,
            prompt=prompt,
        )

        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True,
            max_iterations=10,
            max_execution_time=60,
            handle_parsing_errors=True,
        )

        return agent_id, executor
    
# Initialize the builder
builder = SimplifiedAgentBuilder()

# Register your existing API endpoints as tools
# Example for your input_data endpoint

builder.register_api_endpoint_as_tool(
    endpoint_path="/input_data",
    method="POST",
    description="""Process and store input data in MongoDB. 
    Required parameters:
    - created_object_name: Name for the object to store data in
    - input_data: List of data items to process
    - data_type: Type of data ('strings', 'files', or 'urls')
    
    Example usage: {"created_object_name": "my_dataset", "input_data": ["hello world", "test data"], "data_type": "strings"}""",
    request_model=InputDataRequest,
    tool_name="input_data"
)

# Register your existing API endpoints as tools
# Example for your input_data endpoint
builder.register_api_endpoint_as_tool(
    endpoint_path="/objects/{object_name}",
    method="GET",
    description="""Gets an object from MongoDB by name. """,
    tool_name="object_by_name"
)

# NOTE: Presently chatbots cannot operate browsers.  This is due to difficulties with
# timing and callbacks.

# builder.register_api_endpoint_as_tool(
#     endpoint_path="/research_topic",
#     method="POST",
#     description="""Begin Researching a topic using an online browser to find information through web search. Starts a new research task and returns immediately with a task ID for tracking. The actual answer is gotten later by using the /research_status/{task_id} endpoint.
#     Required parameters:
#     - goal (string): A desired goal to achieve, describing what information you want to find. Example: "the linkedin URL and phone number for John Doe, the CEO of ABC"
#     - return_data (list of strings): List of specific data elements that should be returned from the research.
#     Returned Values:
#     - task_id (string): The API will immediately return a task_id. Keep this - you'll need it to get your results.
#     - status (string): Status of the research operation.
    
#     The function will perform web searches and extract the requested information without requiring logins.""",
#     request_model=ResearchTopicRequest,
#     tool_name="research_topic"
# )


# builder.register_api_endpoint_as_tool(
#     endpoint_path="/research_status/{task_id}",
#     method="GET",
#     description="""Check if your research task is complete and get results.
#     Use the task ID to check periodically until the status changes from "pending" to "completed", "failed", or "timeout".
#     Recommended polling pattern:
#     Check every 15-30 seconds
#     When status is "completed", the output_data field will contain your research results, with the keys as in return_data from research_topic. Expect to wait for these results.""",
#     tool_name="research_status"
# )


# Add more of your existing endpoints here
# Example patterns for other common endpoints:

# builder.register_api_endpoint_as_tool(
#     endpoint_path="/get_data",
#     method="GET", 
#     description="Retrieve stored data from MongoDB by object name",
#     tool_name="get_data"
# )

# builder.register_api_endpoint_as_tool(
#     endpoint_path="/delete_data",
#     method="DELETE",
#     description="Delete data from MongoDB by object name", 
#     tool_name="delete_data"
# )

# builder.register_api_endpoint_as_tool(
#     endpoint_path="/list_objects",
#     method="GET",
#     description="List all available data objects in MongoDB",
#     tool_name="list_objects"
# )

@app.post("/create-agent", response_model=dict)
async def create_agent(request: CreateAgentRequest, user_token: str = Depends(get_user_token)):
    """Create a new agent with custom instructions"""
    try:
        agent_name = str(request.agent_name + user_token) or f"Agent-{len(agents_storage) + 1}"
        agent_id, agent_executor = builder.create_agent(
            instructions=request.instructions,
            agent_name=agent_name
        )
        
        # Store agent
        agents_storage[agent_id] = {
            "agent_executor": agent_executor,
            "agent_name": agent_name,
            "instructions": request.instructions,
            "created_at": str(uuid.uuid4())  # In production, use actual timestamp
        }
        
        return {
            "agent_id": request.agent_name,
            "agent_name": request.agent_name,
            "message": "Agent created successfully",
            "instructions": request.instructions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, user_token: str = Depends(get_user_token)):
    """Send a message to a specific agent"""
    agent_id_plus = request.agent_id + user_token
    if agent_id_plus not in agents_storage:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        agent_info = agents_storage[agent_id_plus]
        agent_executor = agent_info["agent_executor"]
        
        # Get response from agent
        response = agent_executor.invoke({
            "input": request.message
        })
        
        return ChatResponse(
            agent_id=agent_id_plus,
            response=response["output"],
            conversation_id=None  # Could implement conversation tracking
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@app.get("/agents", response_model=List[AgentInfo])
async def list_agents(user_token: str = Depends(get_user_token)):
    """List all created agents"""
    agents = []
    for agent_id, info in agents_storage.items():
        agents.append(AgentInfo(
            agent_id=agent_id,
            agent_name=info["agent_name"],
            instructions=info["instructions"],
            created_at=info["created_at"]
        ))
    return agents

@app.get("/agents/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str,user_token: str = Depends(get_user_token)):
    """Get information about a specific agent"""
    if agent_id not in agents_storage:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    info = agents_storage[agent_id]
    return AgentInfo(
        agent_id=agent_id,
        agent_name=info["agent_name"],
        instructions=info["instructions"],
        created_at=info["created_at"]
    )

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str,user_token: str = Depends(get_user_token)):
    """Delete a specific agent"""
    if agent_id not in agents_storage:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    del agents_storage[agent_id]
    return {"message": "Agent deleted successfully"}

@app.get("/tools")
async def list_available_tools(user_token: str = Depends(get_user_token)):
    """List all available tools that agents can use"""
    tools_info = []
    
    # Add default tools
    for tool in builder.default_tools:
        tools_info.append({
            "name": tool.name,
            "description": tool.description,
            "type": "default"
        })
    
    # Add API tools
    for tool in builder.api_tools:
        tools_info.append({
            "name": tool.name,
            "description": tool.description,
            "type": "api_endpoint"
        })
    
    return {
        "total_tools": len(tools_info),
        "tools": tools_info
    }

@app.post("/register-tool")
async def register_new_tool(request: dict,user_token: str = Depends(get_user_token)):
    """Register a new API endpoint as a tool"""
    try:
        required_fields = ["endpoint_path", "method", "description"]
        if not all(field in request for field in required_fields):
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {required_fields}"
            )
        
        builder.register_api_endpoint_as_tool(
            endpoint_path=request["endpoint_path"],
            method=request["method"],
            description=request["description"],
            tool_name=request.get("tool_name")
        )
        
        return {"message": "Tool registered successfully", "tool_name": request.get("tool_name")}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register tool: {str(e)}")


# Example usage and testing endpoints
# @app.get("/chatbot_instructions")
# async def root(user_token: str = Depends(get_user_token)):
#     """API documentation and examples"""
#     return {
#         "message": "Simplified Agent Service",
#         "usage": {
#             "create_agent": "POST /create-agent with {'instructions': 'Your instructions here'}",
#             "chat": "POST /chat with {'agent_id': 'agent_id', 'message': 'Your message'}",
#             "list_agents": "GET /agents",
#             "delete_agent": "DELETE /agents/{agent_id}"
#         },
#         "example": {
#             "create_agent": {
#                 "instructions": "You are a helpful customer service agent for a tech company. Be friendly and professional.",
#                 "agent_name": "Customer Service Bot"
#             },
#             "chat": {
#                 "agent_id": "your-agent-id-here",
#                 "message": "Hello, how can you help me today?"
#             }
#         }
#     }
    
### END CHATBOT STUFF

### BEGIN Browser use/Skyvern Stuff

# @app.post("/research_topic", response_model=ResearchTopicResponse)
# async def research_topic(request: ResearchTopicRequest):
#     try:
#         if not skyvern_api_key:
#             raise HTTPException(
#                 status_code=500,
#                 detail="Skyvern API key not configured. Please set SKYVERN_API_KEY environment variable."
#             )

#         print('AAAAAAAA')  # This should now print immediately
        
#         # Generate unique task ID
#         task_id = str(uuid.uuid4())
#         created_at = datetime.now()

#         # Store task info in pending tasks
#         pending_tasks[task_id] = {
#             "request": request.dict(),
#             "created_at": created_at,
#             "status": "pending"
#         }

#         # Construct webhook URL
#         webhook_url = f"{webhook_base_url}/webhook/skyvern/{task_id}"

#         # Construct the prompt text
#         plural_return_keys = len(request.return_data) > 1
#         if plural_return_keys:
#             prompt_text = (
#                 f"Starting from a google search, find {request.goal}. "
#                 f"Attempt to find this information without needing to log into any sites. "
#                 f"Return an object with the following keys: {', '.join(request.return_data)}. "
#                 f"Do not nest additional keys or categories under these keys, each of these keys should contain a single string."
#             )
#         else:
#             prompt_text = (
#                 f"Starting from a google search, find {request.goal}. "
#                 f"Attempt to find this information without needing to log into any sites. "
#                 f"Return an object with the following key: {', '.join(request.return_data)}. "
#                 f"Do not nest additional keys or categories under this key, it should just contain a single string."
#             )

#         logger.info(f"Starting Skyvern task {task_id} with webhook URL: {webhook_url}")

#         # Fire and forget - don't await this!
#         asyncio.create_task(run_skyvern_task(task_id, prompt_text, webhook_url))

#         logger.info(f"Skyvern task {task_id} initiated successfully")
        
#         # Return immediately
#         return ResearchTopicResponse(
#             task_id=task_id,
#             status="pending",
#             message="Research task started successfully. Use /research_status/{task_id} to check progress.",
#             created_at=created_at.isoformat()
#         )

#     except Exception as e:
#         logger.error(f"Error starting research task: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error starting research task: {str(e)}"
#         )

# # Separate function to handle the long-running task
# async def run_skyvern_task(task_id: str, prompt_text: str, webhook_url: str):
#     try:
#         # This will run in the background
#         skyvern_result = await skyvern_client.run_task(
#             prompt=prompt_text,
#             webhook_url=webhook_url
#         )
#         logger.info(f"Skyvern task {task_id} completed successfully")
        
#         # Update task status if needed (or let webhook handle it)
#         if task_id in pending_tasks:
#             pending_tasks[task_id]["status"] = "completed"
            
#     except Exception as e:
#         logger.error(f"Skyvern task {task_id} failed: {str(e)}")
#         # Update task status to failed
#         if task_id in pending_tasks:
#             pending_tasks[task_id]["status"] = "failed"
#             pending_tasks[task_id]["error"] = str(e)


@app.post("/research_topic", response_model=ResearchTopicResponse)
async def research_topic(request: ResearchTopicRequest,user_token: str = Depends(get_user_token)):
    """
    Start a research task using Skyvern API
    
    Args:
        request: Contains goal (string) and return_data (list of strings)
    
    Returns:
        Task information with task_id for polling status
    """
    try:
        if not skyvern_api_key:
            raise HTTPException(
                status_code=500, 
                detail="Skyvern API key not configured. Please set SKYVERN_API_KEY environment variable."
            )
        print('AAAAAAAA')
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        # Store task info in pending tasks
        pending_tasks[task_id] = {
            "request": request.model_dump(), #dict(),
            "created_at": created_at,
            "status": "pending"
        }
        
        # Construct webhook URL
        webhook_url = f"{webhook_base_url}/webhook/skyvern/{task_id}"
        
        # Initialize Skyvern client
        #skyvern = Skyvern(api_key=skyvern_api_key)
        
        # Construct the prompt text
        plural_return_keys = len(request.return_data) > 1
        prompt_text = ''
        if plural_return_keys:
            prompt_text = (
                f"Starting from a google search, find {request.goal}. "
                f"Attempt to find this information without needing to log into any sites. "
                f"Return an object with the following keys: {', '.join(request.return_data)}. Do not nest additional keys or categories under these keys, each of these keys should contain a single string."
            )
        else:
            prompt_text = ( 
                f"Starting from a google search, find {request.goal}. "
                f"Attempt to find this information without needing to log into any sites. "
                f"Return an object with the following key: {', '.join(request.return_data)}. Do not nest additional keys or categories under this key, it should just contain a single string."
            )
        logger.info(f"Starting Skyvern task {task_id} with webhook URL: {webhook_url}")
        logger.info(f"sending this prompt text: {prompt_text}")
        # Start the Skyvern task with webhook
        skyvern_result = await skyvern_client.run_task(
            # skyvern_client.run_task(
            prompt=prompt_text,
            webhook_url=webhook_url
        )
        
        print(f"Skyvern result: {skyvern_result}")
        
        logger.info(f"Skyvern task {task_id} initiated successfully")
        
        return ResearchTopicResponse(
            task_id=task_id,
            status="pending",
            message=f"Research task started successfully. Use /research_status/{task_id} to check progress.",
            created_at=created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error starting research task: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error starting research task: {str(e)}"
        )

@app.get("/research_status/{task_id}", response_model=ResearchTopicResponse)
async def get_research_status(task_id: str, user_token: str = Depends(get_user_token)):
    """
    Check the status of a research task
    
    Args:
        task_id: The unique identifier for the research task
    
    Returns:
        Current status and results (if completed) of the research task
    """
    # Check completed tasks first
    if task_id in completed_tasks:
        task_data = completed_tasks[task_id]
        return ResearchTopicResponse(
            task_id=task_id,
            status=task_data["status"],
            output_data=task_data["output"],
            message="Task completed successfully" if task_data["status"] == "completed" else "Task failed",
            created_at=task_data["created_at"].isoformat(),
            completed_at=task_data.get("completed_at", datetime.now()).isoformat()
        )
    
    # Check pending tasks
    if task_id in pending_tasks:
        task_data = pending_tasks[task_id]
        
        # Check if task has timed out (30 minutes default)
        timeout_minutes = 60
        if datetime.now() - task_data["created_at"] > timedelta(minutes=timeout_minutes):
            # Move to completed with timeout status
            completed_tasks[task_id] = {
                **task_data,
                "status": "timeout",
                "completed_at": datetime.now()
            }
            pending_tasks.pop(task_id)
            
            return ResearchTopicResponse(
                task_id=task_id,
                status="timeout",
                message=f"Task timed out after {timeout_minutes} minutes",
                created_at=task_data["created_at"].isoformat(),
                completed_at=datetime.now().isoformat()
            )
        
        return ResearchTopicResponse(
            task_id=task_id,
            status="pending",
            message="Task is still in progress. Please check again in a few moments.",
            created_at=task_data["created_at"].isoformat()
        )
    
    raise HTTPException(
        status_code=404, 
        detail=f"Task with ID {task_id} not found. It may have been cleaned up or never existed."
    )

@app.post("/webhook/skyvern/{task_id}")
async def skyvern_webhook(task_id: str, payload: WebhookPayload): #, user_token: str = Depends(get_user_token)):
    """
    Webhook endpoint to receive Skyvern task completion results
    
    This endpoint is called by Skyvern when a task completes.
    It should not be called directly by clients.
    """
    logger.info(f"Received webhook for task {task_id}: status={payload}")
    
    if task_id not in pending_tasks:
        logger.warning(f"Received webhook for unknown task: {task_id}")
        return {"status": "unknown_task", "message": "Task ID not found in pending tasks"}
    
    # Move task from pending to completed
    task_data = pending_tasks.pop(task_id)
    completed_tasks[task_id] = {
        **task_data,
        "status": payload.status,
        "output": str(payload.output),
        "error": payload.error,
        "completed_at": datetime.now()
    }
    
    logger.info(f"Task {task_id} moved to completed with status: {payload.status}")
    logger.info(f"The Full Object is: {completed_tasks[task_id]}")
    return {
        "status": "received", 
        "message": f"Webhook received for task {task_id}",
        "task_status": payload.status
    }

@app.get("/tasks/pending")
async def list_pending_tasks(user_token: str = Depends(get_user_token)):
    """
    List all currently pending tasks (useful for debugging)
    """
    return {
        "pending_tasks": len(pending_tasks),
        "task_ids": list(pending_tasks.keys()),
        "tasks": {
            task_id: {
                "created_at": task_data["created_at"].isoformat(),
                "goal": task_data["request"]["goal"],
                "status": task_data["status"]
            }
            for task_id, task_data in pending_tasks.items()
        }
    }

@app.get("/tasks/completed")
async def list_completed_tasks(user_token: str = Depends(get_user_token)):
    """
    List recently completed tasks (useful for debugging)
    """
    return {
        "completed_tasks": len(completed_tasks),
        "task_ids": list(completed_tasks.keys()),
        "tasks": {
            task_id: {
                "created_at": task_data["created_at"].isoformat(),
                "completed_at": task_data.get("completed_at", datetime.now()).isoformat(),
                "goal": task_data["request"]["goal"],
                "status": task_data["status"]
            }
            for task_id, task_data in completed_tasks.items()
        }
    }

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user_token: str = Depends(get_user_token)):
    """
    Delete a task from memory (cleanup)
    """
    removed_from = []
    
    if task_id in pending_tasks:
        pending_tasks.pop(task_id)
        removed_from.append("pending")
    
    if task_id in completed_tasks:
        completed_tasks.pop(task_id)
        removed_from.append("completed")
    
    if not removed_from:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "message": f"Task {task_id} removed from {', '.join(removed_from)} tasks",
        "task_id": task_id
    }

# Background cleanup task
async def cleanup_old_tasks():
    """
    Background task to clean up old completed tasks to prevent memory bloat
    """
    while True:
        try:
            current_time = datetime.now()
            cutoff_time = current_time - timedelta(hours=2)  # Keep tasks for 2 hours
            
            # Clean up old completed tasks
            to_remove = [
                task_id for task_id, task_data in completed_tasks.items()
                if task_data.get("completed_at", current_time) < cutoff_time
            ]
            
            for task_id in to_remove:
                completed_tasks.pop(task_id, None)
                logger.info(f"Cleaned up old completed task: {task_id}")
            
            # Clean up very old pending tasks (longer timeout)
            old_pending_cutoff = current_time - timedelta(hours=1)
            old_pending_to_remove = [
                task_id for task_id, task_data in pending_tasks.items()
                if task_data["created_at"] < old_pending_cutoff
            ]
            
            for task_id in old_pending_to_remove:
                pending_tasks.pop(task_id, None)
                logger.info(f"Cleaned up old pending task: {task_id}")
            
            if to_remove or old_pending_to_remove:
                logger.info(f"Cleanup completed: {len(to_remove)} completed tasks, {len(old_pending_to_remove)} old pending tasks removed")
                
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
        
        await asyncio.sleep(1800)  # Run cleanup every 30 minutes
### END Browser use/Skyvern stuff

### BEGIN OTHER API FUNCTIONS

# Text extraction functions
def get_text_from_file(file_data: Any) -> str:
    """
    Extract text from various file types.
    file_data can be:
    - UploadFile object from FastAPI
    - File-like object with .read() method
    - Bytes data
    - String (assumed to be file content)
    """
    try:
        # Handle different input types
        if hasattr(file_data, 'filename') and hasattr(file_data, 'file'):
            # FastAPI UploadFile object
            filename = file_data.filename
            file_content = file_data.file.read()
            file_data.file.seek(0)  # Reset for potential reuse
        elif hasattr(file_data, 'read'):
            # File-like object
            filename = getattr(file_data, 'name', 'unknown_file')
            file_content = file_data.read()
            if hasattr(file_data, 'seek'):
                file_data.seek(0)  # Reset for potential reuse
        elif isinstance(file_data, bytes):
            # Raw bytes - assume text file
            filename = 'unknown_file.txt'
            file_content = file_data
        elif isinstance(file_data, str):
            # String content - return as is
            return file_data
        else:
            return str(file_data)
        
        # Determine file extension
        if '.' in filename:
            ext = '.' + filename.split('.')[-1].lower()
        else:
            ext = '.txt'  # Default assumption
        
        # Extract text based on file type
        if ext == '.txt':
            if isinstance(file_content, bytes):
                return file_content.decode('utf-8')
            else:
                return str(file_content)
                
        elif ext == '.csv':
            # Use pandas to read CSV
            if isinstance(file_content, bytes):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_csv(io.StringIO(str(file_content)))
            return df.to_string(index=False)
            
        elif ext == '.pdf':
            # Use PyPDF2 to extract text from PDF
            if isinstance(file_content, bytes):
                pdf_file = io.BytesIO(file_content)
            else:
                pdf_file = io.BytesIO(file_content.encode('utf-8'))
            
            reader = PyPDF2.PdfReader(pdf_file)
            file_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    file_text += text + "\n"
            return file_text.strip()
            
        elif ext == '.docx':
            # Use python-docx to extract text from Word documents
            if isinstance(file_content, bytes):
                docx_file = io.BytesIO(file_content)
            else:
                docx_file = io.BytesIO(file_content.encode('utf-8'))
            
            doc = Document(docx_file)
            file_text = ""
            for para in doc.paragraphs:
                file_text += para.text + "\n"
            return file_text.strip()
            
        elif ext in ['.xls', '.xlsx']:
            # Use pandas to read Excel files
            if isinstance(file_content, bytes):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                # This case is less likely for Excel files
                df = pd.read_excel(io.StringIO(str(file_content)))
            return df.to_string(index=False)
            
        else:
            # Unknown file type - try to decode as text
            if isinstance(file_content, bytes):
                try:
                    return file_content.decode('utf-8')
                except UnicodeDecodeError:
                    return file_content.decode('utf-8', errors='ignore')
            else:
                return str(file_content)
                
    except Exception as e:
        # If all else fails, return error message
        return f"Error extracting text from file: {str(e)}"

async def get_text_from_url(url: str) -> str:
    """
    Extract text from a URL using the robust URLScraper.
    This uses your existing URLScraper which is good at getting text 
    from URLs even when they're somewhat hard to scrape.
    """
    try:
        # Normalize URL
        normalized_url = normalize_url(url.strip())
        
        # Use your existing URLScraper which handles difficult URLs well
        text = URLScraper.get_visible_text_and_links(normalized_url)
        
        # Add source URL information
        content = f"--- Content from {normalized_url} ---\n{text}"
        
        return content
        
    except Exception as e:
        return f"Error fetching content from {url}: {str(e)}"

def normalize_url(url: str) -> str:
    """Normalize URL by adding protocol if missing"""
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

# Helper functions
async def get_or_create_object(object_name: str) -> Dict[str, Any]:
    """Get existing object or create new one"""
    existing = await collection.find_one({"object_name": object_name})
    if existing:
        print(f"Existing object: {existing}")
        return existing
    else:
        new_obj = {"object_name": object_name, "data": []}
        await collection.insert_one(new_obj)
        print(f"creating object: {new_obj}")
        return new_obj
    
async def create_summary_value(value):
    # if the data is sufficiently short, just return nothing.
    if len(str(value)) < 1000:
        return None
    prompt = f'''
    Here is a document extracted from the web which may contain HTML fragments or other formatting tokens. Write a 30-word summary of this document.

    {value}
    
    '''
    response_json = await call_openai_api(prompt, ['summary']) 
    ret = None
    try:
        ret = response_json.get('summary', None)
    except Exception as e:
        print(f'WARNING: Issue with creating data summary: {e}')
    return ret


async def add_data_entry(object_name: str, key_list: List[str], value: str):
    """Add a data entry to an object"""
    print(f"adding data entry: {object_name}, {key_list}, {value}")
    
    # Build the data entry dict
    data_entry = {"key_list": key_list, "value": value}
    
    summary_value = await create_summary_value(value)
    if summary_value is not None:
        data_entry["summary_value"] = summary_value
    
    await collection.update_one(
        {"object_name": object_name},
        {"$push": {"data": data_entry}}
    )
    
    
    # """Add a data entry to an object"""
    # print(f"adding data entry: {object_name}, {key_list}, {value}")
    # await collection.update_one(
    #     {"object_name": object_name},
    #     {"$push": {"data": {"key_list": key_list, "value": value}}}
    # )

def combine_events(data_entries: List[DataEntry]) -> DataEntry:
    """Combine multiple data entries into one"""
    combined_value = " ".join([entry.value for entry in data_entries])
    combined_summary = " ".join([entry.summary_value for entry in data_entries if entry.summary_value is not None])
    combined_keys = []
    for entry in data_entries:
        combined_keys.extend(entry.key_list)
    unique_keys = list(set(combined_keys))
    
    return DataEntry(key_list=unique_keys, value=combined_value, summary_value=combined_summary if combined_summary else None)

def get_matching_entries(entries1: List[DataEntry], entries2: List[DataEntry]) -> List[tuple]:
    """Get pairs of entries that have matching keys"""
    matches = []
    for entry1 in entries1:
        for entry2 in entries2:
            if set(entry1.key_list).intersection(set(entry2.key_list)):
                matches.append((entry1, entry2))
    return matches

async def call_openai_api(prompt: str, output_keys: List[str]) -> Dict[str, Any]:
    """Call OpenAI API with the given prompt"""
    try:
        # Add instruction for JSON output format
        json_instruction = f"\n\nPlease return your response as a JSON object with the following keys: {', '.join(output_keys)}. Return a value or a list of values for each as appropriate."
        full_prompt = prompt + json_instruction
        client_openai = openai.OpenAI()
        response = client_openai.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that returns responses in JSON format."},
            {"role": "user",   "content": full_prompt}
        ],
        response_format={"type":"json_object"},  # this is the strict mode
        temperature=0.2
        )
        # print(f"Got response: {response.choices[0].message.content}")
        return json.loads(response.choices[0].message.content)  # Already parsed JSON

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

# API Endpoints
@app.post("/input_data")
async def input_data(request: InputDataRequest, user_token: str = Depends(get_user_token)):
    """
    Process input data and store in MongoDB
    """
    try:
        # Get or create the target object
        await get_or_create_object(request.created_object_name + user_token)
        
        processed_count = 0
        
        for item in request.input_data:
            text_content = ""
            
            # Process based on data type
            if request.data_type == "strings":
                text_content = str(item)
            elif request.data_type == "files":
                text_content = get_text_from_file(item)
            elif request.data_type == "urls":
                text_content = await get_text_from_url(str(item))
            else:
                raise HTTPException(status_code=400, detail="Invalid data_type. Must be 'files', 'strings', or 'urls'")
            
            # Create UUID for this entry
            entry_uuid = str(uuid.uuid4())
            
            # Add to database
            await add_data_entry(
                object_name=request.created_object_name + user_token,
                key_list=[entry_uuid],
                value=text_content
            )
            
            processed_count += 1
        # NOTE: We aren't returning the user token here, the created app thinks object_name is the thing to use.
        return JSONResponse(
            content={
                "message": f"Successfully processed {processed_count} items",
                "object_name": request.created_object_name
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")


@app.post("/apply_prompt")
async def apply_prompt(
    request: ApplyPromptRequest,
    session_uid: str = Depends(get_user_token)
):
    print(f"[DEBUG] Starting apply_prompt function")
    print(f"[DEBUG] Request: {request}")
    print(f"[DEBUG] User token: {session_uid}")
    
    try:
        print(f"[DEBUG] Entering try block")
        
        # First, look for a record with same project_id, session_uid, and prompt_string
        print(f"[DEBUG] Looking for exact match in prompt_collection")
        print(f"[DEBUG] Search criteria: session_uid={session_uid}, prompt_string={request.prompt_string}")
        
        exact_match = await prompt_collection.find_one({
            "session_uid": session_uid,
            "prompt_string": request.prompt_string
        })
        
        print(f"[DEBUG] Exact match result: {exact_match}")
        
        if exact_match:
            print(f"[DEBUG] Found exact match - proceeding with existing prompt")
            
            # Found exact match - call apply_existing_prompt
            if "task_id" not in exact_match or exact_match["task_id"] is None:
                print(f"[DEBUG] ERROR: Exact match found but no task_id present")
                raise HTTPException(
                    status_code=400,
                    detail="Found matching record but it has no task_id"
                )
            
            print(f"[DEBUG] Exact match has valid task_id: {exact_match['task_id']}")
            print(f"[DEBUG] Calling apply_existing_prompt with task_id={exact_match['task_id']}")
            
            result = await apply_existing_prompt(
                task_id=exact_match["task_id"],
                request=request,
                prompt_record=exact_match
            )
            
            print(f"[DEBUG] apply_existing_prompt returned: {result}")
            print(f"[DEBUG] Returning result from exact match path")
            return result
        else:
            print(f"[DEBUG] No exact match found - looking for project match")
            
            # No exact match - look for any record with same project_id and session_uid
            print(f"[DEBUG] Searching for any record with session_uid: {session_uid}")
            
            project_match = await prompt_collection.find_one({
                "session_uid": session_uid
            })
            
            print(f"[DEBUG] Project match result: {project_match}")
            
            if not project_match:
                print(f"[DEBUG] ERROR: No project found for session_uid")
                raise HTTPException(
                    status_code=404,
                    detail="No project found for this session_uid"
                )
            
            print(f"[DEBUG] Found project match - generating new task")
            
            # Generate new task for this prompt
            print(f"[DEBUG] Calling generate_task_for_prompt")
            task_id = await generate_task_for_prompt(request, project_match)
            print(f"[DEBUG] Generated new task_id: {task_id}")
            
            # Create new record with same base info plus new task_id and prompt_string
            print(f"[DEBUG] Creating new record based on project match")
            print(f"[DEBUG] Copying fields from project_match (excluding _id)")
            
            new_record = {
                **{k: v for k, v in project_match.items() if k != "_id"}, # Copy all fields except _id
                "task_id": task_id,
                "prompt_string": request.prompt_string,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            print(f"[DEBUG] New record created: {new_record}")
            
            # Insert the new record
            print(f"[DEBUG] Inserting new record into prompt_collection")
            insert_result = await prompt_collection.insert_one(new_record)
            print(f"[DEBUG] Insert result: {insert_result}")
            print(f"[DEBUG] Inserted record ID: {insert_result.inserted_id}")
            
            # Get the newly inserted record
            print(f"[DEBUG] Retrieving newly inserted record")
            new_prompt_record = await prompt_collection.find_one({"_id": insert_result.inserted_id})
            print(f"[DEBUG] Retrieved new prompt record: {new_prompt_record}")
            
            # Call apply_existing_prompt with the new record
            print(f"[DEBUG] Calling apply_existing_prompt with new record")
            print(f"[DEBUG] Parameters: task_id={task_id}, request={request}")
            
            result = await apply_existing_prompt(
                task_id=task_id,
                request=request,
                prompt_record=new_prompt_record
            )
            
            print(f"[DEBUG] apply_existing_prompt returned: {result}")
            print(f"[DEBUG] Returning result from new record path")
            return result
            
    except HTTPException:
        print(f"[DEBUG] Caught HTTPException - re-raising as-is")
        raise # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[DEBUG] Caught unexpected exception: {type(e).__name__}: {str(e)}")
        print(f"[DEBUG] Raising HTTPException with 500 status")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply prompt: {str(e)}"
        )




# async def apply_prompt(
#     request: ApplyPromptRequest, 
#     user_token: str = Depends(get_user_token)
# ):
#     try:
#         # First, look for a record with same project_id, user_token, and prompt_string
#         exact_match = await prompt_collection.find_one({
#             "user_token": user_token,
#             "prompt_string": request.prompt_string
#         })
        
#         if exact_match:
#             # Found exact match - call apply_existing_prompt
#             if "task_id" not in exact_match or exact_match["task_id"] is None:
#                 raise HTTPException(
#                     status_code=400, 
#                     detail="Found matching record but it has no task_id"
#                 )
            
#             result = await apply_existing_prompt(
#                 task_id=exact_match["task_id"],
#                 request=request,
#                 prompt_record=exact_match
#             )
#             return result
        
#         else:
#             # No exact match - look for any record with same project_id and user_token
#             project_match = await prompt_collection.find_one({
#                 "user_token": user_token
#             })
            
#             if not project_match:
#                 raise HTTPException(
#                     status_code=404, 
#                     detail="No project found for this user_token"
#                 )
            
#             # Generate new task for this prompt
#             task_id = await generate_task_for_prompt(request, project_match)
            
#             # Create new record with same base info plus new task_id and prompt_string
#             new_record = {
#                 **{k: v for k, v in project_match.items() if k != "_id"},  # Copy all fields except _id
#                 "task_id": task_id,
#                 "prompt_string": request.prompt_string,
#                 "created_at": datetime.utcnow(),
#                 "updated_at": datetime.utcnow()
#             }
            
#             # Insert the new record
#             insert_result = await prompt_collection.insert_one(new_record)
            
#             # Get the newly inserted record
#             new_prompt_record = await prompt_collection.find_one({"_id": insert_result.inserted_id})
            
#             # Call apply_existing_prompt with the new record
#             result = await apply_existing_prompt(
#                 task_id=task_id,
#                 request=request,
#                 prompt_record=new_prompt_record
#             )
#             return result
            
#     except HTTPException:
#         raise  # Re-raise HTTP exceptions as-is
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Failed to apply prompt: {str(e)}"
#         )


async def generate_task_for_prompt(request: ApplyPromptRequest, project_record: dict) -> str:
    """
    Generate a new task for the given prompt by calling the analytics API
    """
    try:
        # Extract required fields from project_record
        user_id = project_record.get("user_id")
        project_id = project_record.get("project_id")
        
        if not user_id or not project_id:
            raise HTTPException(
                status_code=400,
                detail="Missing user_id or project_id in project record"
            )
        
        # Create basic auth header
        auth_header = user_id # base64.b64encode(f"{user_id}:".encode()).decode()
        
        async with httpx.AsyncClient() as client:
            # Step 1: Create task
            task_payload = {
                "name": request.prompt_string[:15],  # First 15 characters
                "description": "",
                "projectId": project_id
            }
            
            task_response = await client.post(
                "https://analytics.empromptu.ai/api/tasks/",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header}"
                },
                json=task_payload
            )
            
            if task_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create task: {task_response.status_code} - {task_response.text}"
                )
            
            task_data = task_response.json()
            task_id = task_data.get("task_id")
            
            if not task_id:
                raise HTTPException(
                    status_code=500,
                    detail="Task creation did not return a task_id"
                )
            
            # Step 2: Add prompt to task
            prompt_payload = {
                "taskId": task_id,
                "promptText": request.prompt_string,
                "modelName": "gpt-4.1-mini",
                "temperature": 0.2,
                "userId": user_id
            }
            
            prompt_response = await client.post(
                f"https://analytics.empromptu.ai/api/tasks/{task_id}/prompts/",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header}"
                },
                json=prompt_payload
            )
            
            if prompt_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to add prompt to task: {prompt_response.status_code} - {prompt_response.text}"
                )
            
            # Step 3: Activate global quality evaluation
            eval_payload = {
                "isActive": True
            }
            
            eval_response = await client.put(
                f"https://analytics.empromptu.ai/api/tasks/{task_id}/evals/global_quality/active/",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Basic {auth_header}"
                },
                json=eval_payload
            )
            
            if eval_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to activate evaluation: {eval_response.status_code} - {eval_response.text}"
                )
            
            return task_id
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Network error while calling analytics API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate task for prompt: {str(e)}"
        )


@app.post("/apply_existing_prompt")
async def apply_existing_prompt(request: ApplyPromptRequest, user_token: str = Depends(get_user_token), prompt_record=None):
    """
    Apply prompts to data combinations and generate new objects
    """
    try:
        # Step 1: Get all input objects from database
        input_objects = {}
        for input_spec in request.inputs:
            obj = await collection.find_one({"object_name": input_spec.input_object_name + user_token})
            if not obj:
                raise HTTPException(status_code=404, detail=f"Object {input_spec.input_object_name + user_token} not found")
            input_objects[input_spec.input_object_name] = obj
        
        # Step 2: Process each input according to its mode
        processed_inputs = {}
        for input_spec in request.inputs:
            obj_data = input_objects[input_spec.input_object_name]
            # Ensure this fits the formula - one string as value for each input.
            for i in range(len(obj_data["data"])):
                obj_data["data"][i]["value"] = str(obj_data["data"][i]["value"])
            data_entries = [DataEntry(**entry) for entry in obj_data["data"]]
            
            if input_spec.mode == "combine_events":
                # Combine all entries into one
                combined = combine_events(data_entries)
                processed_inputs[input_spec.input_object_name] = [combined]
            else:
                # Keep individual entries
                processed_inputs[input_spec.input_object_name] = data_entries
        
        # Step 3: Generate combinations based on modes
        combinations = []
        input_names = list(processed_inputs.keys())
        input_specs_by_name = {spec.input_object_name: spec for spec in request.inputs}
        
        if len(input_names) == 1:
            # Single input case
            name = input_names[0]
            for entry in processed_inputs[name]:
                combinations.append({name: entry})
        else:
            # Multiple inputs - check if any use match_keys mode
            has_match_keys = any(input_specs_by_name[name].mode == "match_keys" for name in input_names)
            
            if has_match_keys:
                # Handle match_keys mode
                for i, name1 in enumerate(input_names):
                    for j, name2 in enumerate(input_names[i+1:], i+1):
                        if (input_specs_by_name[name1].mode == "match_keys" or 
                            input_specs_by_name[name2].mode == "match_keys"):
                            matches = get_matching_entries(
                                processed_inputs[name1], 
                                processed_inputs[name2]
                            )
                            for entry1, entry2 in matches:
                                combo = {name1: entry1, name2: entry2}
                                # Add other inputs if they exist
                                for other_name in input_names:
                                    if other_name not in [name1, name2]:
                                        # For now, just take first entry of other inputs
                                        if processed_inputs[other_name]:
                                            combo[other_name] = processed_inputs[other_name][0]
                                combinations.append(combo)
            else:
                # All permutations for combine_events and use_individually
                input_lists = [processed_inputs[name] for name in input_names]
                for combo_tuple in product(*input_lists):
                    combo_dict = dict(zip(input_names, combo_tuple))
                    combinations.append(combo_dict)
        
        # Step 4: Apply prompts and call OpenAI
        results_processed = 0
        
        for combo in combinations:
            # Replace placeholders in prompt
            filled_prompt = request.prompt_string
            all_keys = []
            
            for input_name, data_entry in combo.items():
                # NOTE:  Here we figure out when we should use the summary value instead.
                length_of_main_value = len(str(data_entry.value))
                value_to_use = str(data_entry.value)
                if length_of_main_value > 2000:
                    value_to_use = data_entry.summary_value
                
                placeholder = "{" + input_name + "}"
                filled_prompt = filled_prompt.replace(placeholder, value_to_use)
                all_keys.extend(data_entry.key_list)
            
            # Call OpenAI API
            openai_result = await call_openai_api(filled_prompt, request.created_object_names) #  + user_token)
            
            # Step 5: Store results
            unique_keys = list(set(all_keys))
            new_uuid = str(uuid.uuid4())
            final_keys = unique_keys + [new_uuid]
            
            for obj_name in request.created_object_names:
                if obj_name in openai_result:
                    obj_name_plus = obj_name + user_token
                    # Ensure target object exists
                    await get_or_create_object(obj_name_plus)
                    
                    # Add the result
                    await add_data_entry(
                        object_name=obj_name_plus,
                        key_list=final_keys,
                        # value=str(openai_result[obj_name])
                        value=openai_result[obj_name]
                    )
            
            results_processed += 1
        
        # Note we aren't sending the user_token part of the created_object_names back.
        return JSONResponse(
            content={
                "message": f"Successfully processed {results_processed} combinations",
                "created_objects": request.created_object_names,
                "combinations_processed": len(combinations)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/objects/{object_name}")
async def get_object(object_name: str, user_token: str = Depends(get_user_token)):
    """Get an object by name"""
    obj = await collection.find_one({"object_name": object_name + user_token})
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    # Remove MongoDB's _id field for cleaner response
    obj.pop("_id", None)
    return obj


@app.get("/return_data/{object_name}")
async def return_data(object_name: str, user_token: str = Depends(get_user_token)):
    """
    Return an object plus all related objects that share at least one key.
    This finds objects with data entries that have overlapping key_list values.
    """
    try:
        # Get the primary object
        primary_obj = await collection.find_one({"object_name": object_name + user_token})
        if not primary_obj:
            raise HTTPException(status_code=404, detail=f"Object '{object_name + user_token}' not found")
        
        # Extract all keys from the primary object
        primary_keys = set()
        for data_entry in primary_obj.get("data", []):
            primary_keys.update(data_entry.get("key_list", []))
        
        if not primary_keys:
            # If primary object has no keys, just return it alone
            primary_obj.pop("_id", None)
            data_value = primary_obj.get("data",[])
            text_value = ''
            if data_value != []:
                # text_value = '\n'.join([str(data_value[0].get['value'])])
                # concatenate all the text values.
                text_value = '\n'.join([str(i.get('value')) for i in data_value])
            return {
                "object_name": primary_obj.get("object_name",object_name),
                "text_value": text_value,
                "data": data_value,
                "related_objects": [],
                "total_objects": 1,
                "shared_keys_found": []
            }
        
        # Find all other objects that have at least one matching key
        related_objects = []
        shared_keys_summary = []
        
        # Get all objects except the primary one
        cursor = collection.find({"object_name": {"$ne": object_name + user_token}})
        all_other_objects = await cursor.to_list(length=None)
        
        for obj in all_other_objects:
            obj_keys = set()
            matching_keys = set()
            
            # Collect all keys from this object and find matches
            for data_entry in obj.get("data", []):
                entry_keys = set(data_entry.get("key_list", []))
                obj_keys.update(entry_keys)
                
                # Check if any keys match with primary object
                matches = entry_keys.intersection(primary_keys)
                matching_keys.update(matches)
            
            # If there are any matching keys, include this object
            if matching_keys:
                obj.pop("_id", None)  # Remove MongoDB ID
                related_objects.append(obj)
                shared_keys_summary.append({
                    "object_name": obj["object_name"],
                    "shared_keys": list(matching_keys),
                    "shared_key_count": len(matching_keys)
                })
        
        # Remove MongoDB ID from primary object
        primary_obj.pop("_id", None)
        
        data_value = primary_obj.get("data",[])
        text_value = ''
        if data_value != []:
            # text_value = '\n'.join([str(data_value[0].get['value'])])
            # concatenate all the text values.
            text_value = '\n'.join([str(i.get('value')) for i in data_value])
        
        returned_object = {
            # "data": primary_obj,
            "object_name": primary_obj.get("object_name",object_name),
            "text_value": text_value,
            "data": data_value, #primary_obj.get("data",[]),
            "related_objects": related_objects,
            "total_objects": 1 + len(related_objects),
            "shared_keys_summary": shared_keys_summary,
            "primary_object_keys": list(primary_keys)
        }
        
        print(f"\nRETURNING THIS OBJECT:\n{returned_object}")
        
        return returned_object #{
        #     # "data": primary_obj,
        #     "object_name": primary_obj.get("object_name",object_name),
        #     "data": primary_obj.get("data",[]),
        #     "related_objects": related_objects,
        #     "total_objects": 1 + len(related_objects),
        #     "shared_keys_summary": shared_keys_summary,
        #     "primary_object_keys": list(primary_keys)
        # }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# should be jsut for debug
# @app.get("/objects")
# async def list_objects():
#     """List all objects"""
#     cursor = collection.find({}, {"_id": 0})
#     objects = await cursor.to_list(length=None)
#     return {"objects": [obj["object_name"] for obj in objects]}

@app.delete("/objects/{object_name}")
async def delete_object(object_name: str,user_token: str = Depends(get_user_token)):
    """Delete an object"""
    result = await collection.delete_one({"object_name": object_name + user_token})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Object not found")
    return {"message": f"Object {object_name} deleted successfully"}

# @app.post("/scrape_urls")
# async def scrape_urls(
#     object_name: str = Body(...),
#     urls: Union[str, List[str]] = Body(...)
# ):
#     """
#     Legacy endpoint: Scrape URLs and create data object with the new system structure.
#     This endpoint maintains backward compatibility while using the new data model.
#     """
#     try:
#         # Convert input to list
#         if isinstance(urls, str):
#             url_list = [normalize_url(url.strip()) for url in urls.split(',') if url.strip()]
#         else:
#             url_list = [normalize_url(str(url).strip()) for url in urls if str(url).strip()]
        
#         # Get or create the target object
#         await get_or_create_object(object_name)
        
#         # Process URLs
#         processed_count = 0
#         for url in url_list:
#             try:
#                 # Use the existing get_text_from_url function
#                 content = await get_text_from_url(url)
                
#                 # Create UUID for this entry (matches new system structure)
#                 entry_uuid = str(uuid.uuid4())
                
#                 # Add to database using new system structure
#                 await add_data_entry(
#                     object_name=object_name,
#                     key_list=[entry_uuid],  # Use UUID as key like the new system
#                     value=content
#                 )
                
#                 processed_count += 1
                
#             except Exception as e:
#                 # Still process failed URLs but with error message
#                 error_content = f"--- Failed to fetch from {url}: {str(e)} ---"
#                 entry_uuid = str(uuid.uuid4())
                
#                 await add_data_entry(
#                     object_name=object_name,
#                     key_list=[entry_uuid],
#                     value=error_content
#                 )
        
#         return JSONResponse(
#             content={
#                 "message": f"URLs scraped and saved under object_name: {object_name}",
#                 "urls_processed": len(url_list),
#                 "rows_created": processed_count,
#                 "object_name": object_name
#             }
#         )
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}



# # Set lifetime for Skyvern/web-research events
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """
#     Lifespan event handler for startup and shutdown events
#     """
#     # Startup
#     logger.info("Starting Skyvern Research API")
#     logger.info(f"Webhook base URL: {webhook_base_url}")
#     logger.info(f"Skyvern API configured: {bool(skyvern_api_key)}")
    
#     # Start the cleanup task
#     cleanup_task = asyncio.create_task(cleanup_old_tasks())
    
#     yield  # Application runs here
    
#     # Shutdown
#     logger.info("Shutting down Skyvern Research API")
#     cleanup_task.cancel()
#     try:
#         await cleanup_task
#     except asyncio.CancelledError:
#         logger.info("Cleanup task cancelled successfully")

