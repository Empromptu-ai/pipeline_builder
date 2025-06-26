import { storeApiResponseAsSecrets, getUserSecret } from '~/lib/secrets.server';

// Generic function to call external APIs and optionally store results
export async function callExternalAPI<T = any>(
  url: string,
  options: RequestInit = {},
  userId?: string,
  storeOptions?: {
    keyPrefix?: string;
    storeResponse?: boolean;
  }
): Promise<{ data: T; stored?: any[] }> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data: T = await response.json();

    // Optionally store the response as secrets
    let stored;
    if (userId && storeOptions?.storeResponse) {
      stored = await storeApiResponseAsSecrets(
        userId,
        data as Record<string, any>,
        storeOptions.keyPrefix || 'api'
      );
    }

    return { data, stored };
  } catch (error) {
    console.error('External API call failed:', error);
    throw error;
  }
}

// Function to call API with user's stored credentials
export async function callAPIWithUserCredentials(
  url: string,
  userId: string,
  credentialKey: string = 'api_key',
  options: RequestInit = {}
) {
  // Get user's stored API key or credential
  const credential = await getUserSecret(userId, credentialKey);
  
  if (!credential) {
    throw new Error(`User credential '${credentialKey}' not found`);
  }

  // Add the credential to the request headers
  const headers = {
    'Authorization': `Bearer ${credential}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return callExternalAPI(url, { ...options, headers }, userId);
}

// Example: OpenAI API call with user's API key
export async function callOpenAI(
  userId: string,
  prompt: string,
  model: string = 'gpt-3.5-turbo'
) {
  const openaiKey = await getUserSecret(userId, 'openai_api_key');
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not found for user');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API call failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Optionally store the conversation or response
  await storeApiResponseAsSecrets(
    userId,
    {
      prompt,
      response: data.choices[0]?.message?.content,
      model,
      timestamp: new Date().toISOString(),
    },
    'openai_conversation'
  );

  return data;
}

// Example: Generic third-party service integration
export async function integrateThirdPartyService(
  userId: string,
  serviceName: string,
  endpoint: string,
  data: Record<string, any>
) {
  try {
    // Call the external service
    const result = await callExternalAPI(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      userId,
      {
        keyPrefix: `${serviceName}_response`,
        storeResponse: true,
      }
    );

    // Store integration metadata
    await storeApiResponseAsSecrets(
      userId,
      {
        service: serviceName,
        lastIntegration: new Date().toISOString(),
        endpoint,
        status: 'success',
      },
      `${serviceName}_meta`
    );

    return result;
  } catch (error) {
    // Store error information
    await storeApiResponseAsSecrets(
      userId,
      {
        service: serviceName,
        lastIntegration: new Date().toISOString(),
        endpoint,
        status: 'error',
        error: error.message,
      },
      `${serviceName}_meta`
    );

    throw error;
  }
}
