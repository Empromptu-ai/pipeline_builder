import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
// import { CONTINUE_PROMPT, API_CHATBOT_PROMPT,  INJECTED_PROMPT_1 , INJECTED_PROMPT_2, getApiChatbotPrompt , getInjectedPrompt1} from '~/lib/.server/llm/prompts';
import { CONTINUE_PROMPT, INJECTED_PROMPT_2, getApiChatbotPrompt , getInjectedPrompt1} from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getAnthropicModel } from '~/lib/.server/llm/model';
import { getUserSession } from '~/utils/session.server';
// import { generateSessionId } from '~/utils/sessionId';

const estimateTokens = (text: string): number => {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil((text || '').length / 4);
};

const manageContextWindow = (messages: Messages, maxTokens: number = 150000): Messages => {
  // Calculate total tokens in current conversation
  let totalTokens = messages.reduce((sum, msg) => {
    return sum + estimateTokens(msg.content || '');
  }, 0);

  console.log(`Total tokens before management: ${totalTokens}`);

  // If we're under the limit, return messages as-is
  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Create a copy to avoid mutating the original
  const managedMessages = [...messages];
  
  // Always keep the first message (system context) and last few messages
  const keepRecentCount = 6; // Keep last 6 messages for context
  
  // Remove messages from the middle until we're under the token limit
  while (totalTokens > maxTokens && managedMessages.length > keepRecentCount + 1) {
    // Find the oldest non-system message to remove
    let removeIndex = 1;
    
    // Skip any critical messages at the beginning
    while (removeIndex < managedMessages.length - keepRecentCount) {
      const msg = managedMessages[removeIndex];
      
      // Don't remove injected prompts or transition markers
      if (msg.role === 'user' && (
        msg.content.includes('[INJECTED_PROMPT_1]') || 
        msg.content.includes('[INJECTED_PROMPT_2]')
      )) {
        removeIndex++;
        continue;
      }
      
      if (msg.role === 'assistant' && msg.content.includes('[final]')) {
        removeIndex++;
        continue;
      }
      
      break;
    }
    
    if (removeIndex < managedMessages.length - keepRecentCount) {
      const removedMessage = managedMessages.splice(removeIndex, 1)[0];
      totalTokens -= estimateTokens(removedMessage.content || '');
      console.log(`Removed message, tokens now: ${totalTokens}`);
    } else {
      break; // Safety break if we can't find anything to remove
    }
  }

  console.log(`Context managed: ${messages.length - managedMessages.length} messages removed`);
  console.log(`Final managed messages count: ${managedMessages.length}, tokens: ${totalTokens}`);
  
  return managedMessages;
};

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages } = await request.json<{ messages: Messages }>();

  console.log(`The request Object: ${request}`);
  console.log(`The request Object messages: ${messages}`);
  console.log(`The request Object: ${JSON.stringify(request)}`);
  console.log(`The request Object messages: ${JSON.stringify(messages, null, 2)}`);
  console.log('The request Object:', request);
  console.log('The request Object messages:', messages);

  // get the user session and pull the session UID out of it.
  // (Get sessionUid from the __session cookie)
  const cookieHeader = request.headers.get("Cookie");
  let sessionUid = null;

  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/__session=([^;]+)/);
    if (sessionMatch) {
      try {
        const sessionData = JSON.parse(atob(decodeURIComponent(sessionMatch[1])));
        description = sessionData.userSession?.userId;
      } catch (error) {
        console.error('Error decoding session:', error);
      }
    }
  }



  // const userSession = await getUserSession(request);
  // const description = userSession.sessionUid;

  console.log('Got description in api.chat.ts', description);

  // Generate a unique session ID for this conversation
  // const sessionId = generateSessionId();
  // console.log(`Generated session ID: ${sessionId}`);

  // NEW:  Also we changed "messages" to "managedMessages" after this
  const managedMessages = manageContextWindow(messages, 180000);

  const stream = new SwitchableStream();

  try {
    // Check if we've already transitioned to the original agent
    const hasTransitioned = checkIfAlreadyTransitioned(managedMessages);
    
    if (!hasTransitioned) {
      // Use your agent first
      console.log('Using your agent...');
      
      // Create options with proper stream closing and transition detection
      const yourAgentOptions: StreamingOptions = {
        onFinish: async ({ text: content, finishReason }: { text: string; finishReason: string }) => {
          console.log('Your agent finished with reason:', finishReason);
          
          // Check if we should transition to original agent
          if (checkIfShouldTransition(content)) {
            console.log('Transition detected! Immediately injecting first prompt...');
            
            // Add the assistant's response to messages
            const updatedMessages: Messages = [...managedMessages, { role: 'assistant' as const, content }];
            
            // Inject the first prompt immediately
            const injectedMessages = injectSinglePrompt(updatedMessages, 1, description);
            
            // Continue with original agent using injected prompt
            const originalAgentOptions: StreamingOptions = {
              toolChoice: 'none',
              onFinish: async ({ text: responseContent, finishReason: responseFinishReason }: { text: string; finishReason: string }) => {
                if (responseFinishReason !== 'length') {
                  // After first prompt response, inject second prompt immediately
                  console.log('First prompt response complete, injecting second prompt...');
                  
                  const messagesWithFirstResponse: Messages = [...injectedMessages, { role: 'assistant' as const, content: responseContent }];
                  const secondInjectedMessages = injectSinglePrompt(messagesWithFirstResponse, 2, description);
                  
                  // Continue with second prompt
                  const secondPromptOptions: StreamingOptions = {
                    toolChoice: 'none',
                    onFinish: async ({ text: finalContent, finishReason: finalFinishReason }: { text: string; finishReason: string }) => {
                      if (finalFinishReason !== 'length') {
                        return stream.close();
                      }
                      // Handle continuation for second prompt if needed
                      if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
                        throw Error('Cannot continue message: Maximum segments reached');
                      }
                      secondInjectedMessages.push({ role: 'assistant' as const, content: finalContent });
                      secondInjectedMessages.push({ role: 'user' as const, content: CONTINUE_PROMPT });
                      const result = await streamText(secondInjectedMessages, context.cloudflare.env, secondPromptOptions);
                      return stream.switchSource(result.toAIStream());
                    },
                  };
                  
                  const secondResult = await streamText(secondInjectedMessages, context.cloudflare.env, secondPromptOptions);
                  return stream.switchSource(secondResult.toAIStream());
                }
                
                // Handle continuation for first prompt if needed
                if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
                  throw Error('Cannot continue message: Maximum segments reached');
                }
                injectedMessages.push({ role: 'assistant' as const, content: responseContent });
                injectedMessages.push({ role: 'user' as const, content: CONTINUE_PROMPT });
                const result = await streamText(injectedMessages, context.cloudflare.env, originalAgentOptions);
                return stream.switchSource(result.toAIStream());
              },
            };
            
            const originalResult = await streamText(injectedMessages, context.cloudflare.env, originalAgentOptions);
            return stream.switchSource(originalResult.toAIStream());
          }
          
          // No transition - close normally
          if (finishReason !== 'length') {
            console.log('Closing stream - your agent finished without transition');
            return stream.close();
          }
          
          // Handle continuation for your agent
          if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
            throw Error('Cannot continue message: Maximum segments reached');
          }
          const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
          console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);
          managedMessages.push({ role: 'assistant' as const, content });
          managedMessages.push({ role: 'user' as const, content: CONTINUE_PROMPT });
          console.log('About to Steam text with description:', description);
          const result = await streamTextWithYourAgent(managedMessages, context.cloudflare.env, yourAgentOptions, description);
          return stream.switchSource(result.toAIStream());
        },
      };

      console.log('About to Steam text with description:', description);
      const result = await streamTextWithYourAgent(managedMessages, context.cloudflare.env, yourAgentOptions, description);
      stream.switchSource(result.toAIStream());
      
    } else {
      // We've already transitioned - normal original agent flow
      console.log('Using original agent (already transitioned)...');
      const options: StreamingOptions = {
        toolChoice: 'none',
        onFinish: async ({ text: content, finishReason }: { text: string; finishReason: string }) => {
          if (finishReason !== 'length') {
            return stream.close();
          }
          if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
            throw Error('Cannot continue message: Maximum segments reached');
          }
          const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
          console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);
          managedMessages.push({ role: 'assistant' as const, content });
          managedMessages.push({ role: 'user' as const, content: CONTINUE_PROMPT });
          const result = await streamText(managedMessages, context.cloudflare.env, options);
          return stream.switchSource(result.toAIStream());
        },
      };
      
      const result = await streamText(managedMessages, context.cloudflare.env, options);
      stream.switchSource(result.toAIStream());
    }

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.log(error);
    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

// Simplified helper functions since we're handling injection inline now
function streamTextWithYourAgent(messages: Messages, env: Env, options?: StreamingOptions, description: string) {
  return _streamText({
    model: getAnthropicModel(getAPIKey(env)),
    system: getYourAgentSystemPrompt(description),
    maxTokens: MAX_TOKENS,
    headers: {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    },
    messages: convertToCoreMessages(messages),
    ...options,
  });
}

function getYourAgentSystemPrompt(description: string): string {
  //return API_CHATBOT_PROMPT; //(sessionId);
  console.log('getYourAgentSystemPrompt with description:', description);
  return getApiChatbotPrompt(description); // should include current sessionId
}

function checkIfAlreadyTransitioned(messages: Messages): boolean {
  // Check if any assistant message contains [final] AND we have injected prompts after it
  const hasTransitionMarker = messages.some(msg => 
    msg.role === 'assistant' && msg.content.includes('[final]')
  );
  
  // If no transition marker, definitely not transitioned
  if (!hasTransitionMarker) {
    return false;
  }
  
  // Check if we have injected prompts (meaning we're in post-transition phase)
  const hasInjectedPrompts = messages.some(msg => 
    msg.role === 'user' && (
      msg.content.includes('[INJECTED_PROMPT_1]') || 
      msg.content.includes('[INJECTED_PROMPT_2]')
    )
  );
  
  return hasInjectedPrompts;
}

function checkIfShouldTransition(responseText: string): boolean {
  return responseText.includes('[final]');
}

function injectSinglePrompt(messages: Messages, promptNumber: 1 | 2, description: string): Messages {
  const injectedMessages = [...messages];
  console.log(`Injecting prompt ${promptNumber} into messages`);
  
  if (promptNumber === 1) {
    injectedMessages.push({ 
      role: 'user' as const, 
      // content:  INJECTED_PROMPT_1 //'[INJECTED_PROMPT_1] Please review the API spec and be absolutely sure that you are calling those functions with the appropriate data formats, for example ensuring that you are sending object_name values, encapsulating input correctly in json, and using the exact function endpoints as they were defined.' 
      content:  getInjectedPrompt1(description) // INJECTED_PROMPT_1   // (sessionId) //
    });
  } else {
    injectedMessages.push({ 
      role: 'user' as const, 
      content: INJECTED_PROMPT_2 
    });
  }
  
  return injectedMessages;
}
