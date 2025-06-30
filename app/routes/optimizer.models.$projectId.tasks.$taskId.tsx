import React, { useState } from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { OptimizerLayout } from '~/components/layout/OptimizerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import MetricCard from '~/components/optimizer/MetricCard';
import { Cpu, Zap, Clock, MessageCircle, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '~/hooks/useUser';

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey?: string;
  contextLength: number;
  costPer1kTokens: number;
  temperature: number;
  isActive: boolean;
}

interface ModelResult {
  id: string;
  model: string;
  prompt: string;
  input: string;
  output: string;
  latency: number;
  tokenCount: number;
  cost: number;
  timestamp: Date;
}

const ModelOptimizationPage = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  useUser();

  const [userInput, setUserInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ModelResult | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState('openai');
  const [newModelApiKey, setNewModelApiKey] = useState('');
  const [newModelContextLength, setNewModelContextLength] = useState('8192');
  const [newModelCost, setNewModelCost] = useState('0.01');
  const [newModelTemperature, setNewModelTemperature] = useState('0.7');
  const [userModels, setUserModels] = useState<ModelConfig[]>([
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextLength: 128000,
      costPer1kTokens: 0.01,
      temperature: 0.7,
      isActive: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextLength: 128000,
      costPer1kTokens: 0.005,
      temperature: 0.7,
      isActive: true,
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      contextLength: 200000,
      costPer1kTokens: 0.015,
      temperature: 0.7,
      isActive: true,
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      contextLength: 180000,
      costPer1kTokens: 0.008,
      temperature: 0.7,
      isActive: true,
    },
  ]);

  const providers = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'google', name: 'Google AI' },
    { id: 'meta', name: 'Meta AI' },
    { id: 'mistral', name: 'Mistral AI' },
    { id: 'custom', name: 'Custom Provider' },
  ];

  const addNewModel = () => {
    if (!newModelName.trim()) {
      toast.error('Please provide a name for the model.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    const newModel: ModelConfig = {
      id: `model-${Date.now()}`,
      name: newModelName,
      provider: newModelProvider,
      apiKey: newModelApiKey.trim() || undefined,
      contextLength: parseInt(newModelContextLength) || 8192,
      costPer1kTokens: parseFloat(newModelCost) || 0.01,
      temperature: parseFloat(newModelTemperature) || 0.7,
      isActive: true,
    };

    setUserModels((prev) => [...prev, newModel]);
    setIsAddingModel(false);
    resetNewModelForm();

    toast.success(`${newModelName} has been added to your models.`, {
      position: 'bottom-right',
      autoClose: 3000,
    });
  };

  const resetNewModelForm = () => {
    setNewModelName('');
    setNewModelProvider('openai');
    setNewModelApiKey('');
    setNewModelContextLength('8192');
    setNewModelCost('0.01');
    setNewModelTemperature('0.7');
  };

  const toggleModelActive = (modelId: string) => {
    setUserModels((prev) =>
      prev.map((model) => (model.id === modelId ? { ...model, isActive: !model.isActive } : model)),
    );
  };

  const removeModel = (modelId: string) => {
    setUserModels((prev) => prev.filter((model) => model.id !== modelId));
    toast.success('The model has been removed from your list.', {
      position: 'bottom-right',
      autoClose: 3000,
    });
  };

  const runModelTest = async () => {
    if (!userInput.trim() || !prompt.trim()) {
      toast.error('Please provide both user input and a prompt.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    if (!selectedModel) {
      toast.error('Please select a model to test.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const modelConfig = userModels.find((m) => m.id === selectedModel);

      const result: ModelResult = {
        id: `test-${Date.now()}`,
        model: selectedModel,
        prompt,
        input: userInput,
        output: `This is a simulated response from ${modelConfig?.name || selectedModel} with temperature ${temperature}.\n\nBased on the user input: "${userInput}"\n\nAnd using the prompt: "${prompt}"\n\nThe model would generate a thoughtful response here addressing the user's input in accordance with the given prompt.`,
        latency: Math.round(Math.random() * 1000 + 500),
        tokenCount: Math.round(Math.random() * 1000 + 200),
        cost: parseFloat((Math.random() * 0.1).toFixed(4)),
        timestamp: new Date(),
      };

      setCurrentResult(result);
      setModelResults((prev) => [result, ...prev].slice(0, 10));

      toast.success(`Successfully tested ${modelConfig?.name || selectedModel}.`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error testing model:', error);
      toast.error('Failed to test model. Please try again.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runBatchTest = async () => {
    if (!userInput.trim() || !prompt.trim()) {
      toast.error('Please provide both user input and a prompt.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    const activeModels = userModels.filter((model) => model.isActive);

    if (activeModels.length === 0) {
      toast.error('Please activate at least one model for testing.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);
    toast.success(`Testing ${activeModels.length} models...`, {
      position: 'bottom-right',
      autoClose: 3000,
    });

    try {
      for (const model of activeModels) {
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        const result: ModelResult = {
          id: `test-${Date.now()}-${model.id}`,
          model: model.id,
          prompt,
          input: userInput,
          output: `This is a simulated response from ${model.name} with temperature ${model.temperature}.\n\nBased on the user input: "${userInput}"\n\nAnd using the prompt: "${prompt}"\n\nThe model would generate a thoughtful response here addressing the user's input in accordance with the given prompt.`,
          latency: Math.round(Math.random() * (model.id.includes('gpt-4o') ? 2000 : 1000) + 500),
          tokenCount: Math.round(Math.random() * 1000 + 200),
          cost: parseFloat((Math.random() * model.costPer1kTokens * 2).toFixed(4)),
          timestamp: new Date(),
        };

        setModelResults((prev) => [result, ...prev].slice(0, 20));
        setCurrentResult(result);
      }

      toast.success(`Successfully tested ${activeModels.length} models.`, {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error in batch test:', error);
      toast.error('Failed to complete batch test. Some models may not have been tested.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OptimizerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/optimizer/projects/${projectId}/tasks/${taskId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Task
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Model Optimization</h1>
            <p className="text-muted-foreground">
              Test and compare different AI models to find the best fit for your use case
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Models</CardTitle>
                <CardDescription>Models you can use for testing and comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium">Active Models</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => setIsAddingModel(true)}
                    >
                      <Plus className="w-4 h-4" /> Add Model
                    </Button>
                  </div>

                  {isAddingModel ? (
                    <Card className="border-dashed">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Add New Model</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="new-model-name">Model Name</Label>
                            <Input
                              id="new-model-name"
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                              placeholder="e.g., GPT-4o, Claude 3, etc."
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="new-model-provider">Provider</Label>
                            <Select value={newModelProvider} onValueChange={setNewModelProvider}>
                              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-xl z-[100]">
                                {providers.map((provider) => (
                                  <SelectItem
                                    key={provider.id}
                                    value={provider.id}
                                    className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                                  >
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="new-model-api-key">API Key (Optional)</Label>
                          <Input
                            id="new-model-api-key"
                            value={newModelApiKey}
                            onChange={(e) => setNewModelApiKey(e.target.value)}
                            placeholder="Enter API key if required"
                            type="password"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="new-model-context">Context Length</Label>
                            <Input
                              id="new-model-context"
                              value={newModelContextLength}
                              onChange={(e) => setNewModelContextLength(e.target.value)}
                              type="number"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="new-model-cost">Cost per 1K tokens</Label>
                            <Input
                              id="new-model-cost"
                              value={newModelCost}
                              onChange={(e) => setNewModelCost(e.target.value)}
                              type="number"
                              step="0.001"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="new-model-temp">Default Temperature</Label>
                            <Input
                              id="new-model-temp"
                              value={newModelTemperature}
                              onChange={(e) => setNewModelTemperature(e.target.value)}
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingModel(false);
                            resetNewModelForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={addNewModel}>Save Model</Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Context</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userModels.map((model) => (
                            <TableRow key={model.id}>
                              <TableCell className="font-medium">{model.name}</TableCell>
                              <TableCell>
                                {providers.find((p) => p.id === model.provider)?.name || model.provider}
                              </TableCell>
                              <TableCell>{model.contextLength.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={model.isActive ? 'default' : 'outline'}
                                  className="cursor-pointer"
                                  onClick={() => toggleModelActive(model.id)}
                                >
                                  {model.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeModel(model.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
                <CardDescription>Configure test parameters and inputs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Select Model for Individual Test</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-xl z-[100]">
                      {userModels
                        .filter((model) => model.isActive)
                        .map((model) => (
                          <SelectItem
                            key={model.id}
                            value={model.id}
                            className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                          >
                            {model.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground min-w-[2rem]">0</span>
                      <div className="flex-1 relative">
                        <input
                          id="temperature"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full mt-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
                          style={{
                            background: `linear-gradient(to right, #9333ea 0%, #9333ea ${temperature * 100}%, #e5e7eb ${temperature * 100}%, #e5e7eb 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-[2rem]">1</span>
                      <span className="text-sm font-medium min-w-[3rem] bg-muted px-2 py-1 rounded">{temperature}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lower values give more deterministic outputs, higher values more random (0.1-1.0)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">System Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your system prompt here..."
                    className="min-h-32"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userInput">User Input</Label>
                  <Textarea
                    id="userInput"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter sample user input here..."
                    className="min-h-32"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <Button
                  onClick={runModelTest}
                  disabled={isLoading || !userInput.trim() || !prompt.trim() || !selectedModel}
                  className="w-full sm:flex-1 bg-purple-600 text-white"
                >
                  {isLoading ? 'Testing Model...' : 'Test Selected Model'}
                </Button>
                <Button
                  onClick={runBatchTest}
                  disabled={
                    isLoading ||
                    !userInput.trim() ||
                    !prompt.trim() ||
                    userModels.filter((m) => m.isActive).length === 0
                  }
                  className="w-full sm:flex-1"
                  variant="outline"
                >
                  {isLoading ? 'Testing Models...' : 'Test All Active Models'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            {currentResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Model Response</CardTitle>
                  <CardDescription>
                    Output from {userModels.find((m) => m.id === currentResult.model)?.name || currentResult.model}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricCard
                      title="Latency"
                      value={`${currentResult.latency}ms`}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    <MetricCard
                      title="Tokens"
                      value={currentResult.tokenCount}
                      icon={<MessageCircle className="h-4 w-4" />}
                    />
                    <MetricCard
                      title="Cost"
                      value={`$${currentResult.cost.toFixed(4)}`}
                      icon={<Zap className="h-4 w-4" />}
                    />
                    <MetricCard
                      title="Model"
                      value={
                        userModels.find((m) => m.id === currentResult.model)?.name.split(' ')[0] ||
                        currentResult.model.split('-')[0].toUpperCase()
                      }
                      icon={<Cpu className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Model Output:</h3>
                    <div className="p-4 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm">
                      {currentResult.output}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {modelResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Results Comparison</CardTitle>
                  <CardDescription>Compare performance across models</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelResults.map((result) => (
                        <TableRow
                          key={result.id}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => setCurrentResult(result)}
                        >
                          <TableCell className="font-medium">
                            {userModels.find((m) => m.id === result.model)?.name || result.model}
                          </TableCell>
                          <TableCell>{result.latency}ms</TableCell>
                          <TableCell>{result.tokenCount}</TableCell>
                          <TableCell>${result.cost.toFixed(4)}</TableCell>
                          <TableCell>{result.timestamp.toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </OptimizerLayout>
  );
};

export default ModelOptimizationPage;
