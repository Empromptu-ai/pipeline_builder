import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Loader2 } from 'lucide-react';
import CreatePromptDialog from '~/components/prompts/CreatePromptDialog';
import ViewPromptDialogLink from '~/components/prompts/ViewPromptDialogLink';
import type { Model } from '~/lib/services/optimizer';

interface Prompt {
  id: string;
  text: string;
  active: boolean;
  model_name: string;
  temperature: number;
  created_at: string;
}

interface PromptFamilyProps {
  prompts: Prompt[];
  onCreatePrompt: () => void;
  onRefresh?: () => void;
  models?: Model[];
  loading: boolean;
}

const PromptFamily: React.FC<PromptFamilyProps> = ({ prompts, onCreatePrompt, onRefresh, models = [], loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Your Prompt Family</CardTitle>
            <CardDescription className="pt-4">
              A prompt family is a collection of prompts that work together to perform better than any single prompt
              could. Start with one prompt, and Empromptu will help you to build out the whole family.
            </CardDescription>
          </div>
          <CreatePromptDialog onCreate={onCreatePrompt} models={models} onRefresh={onRefresh} />
        </div>
      </CardHeader>
      <CardContent>
        {prompts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No prompts yet. Create your first prompt to get started.</p>
            <CreatePromptDialog onCreate={onCreatePrompt} models={models} onRefresh={onRefresh} />
          </div>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div key={prompt.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">Prompt-{index + 1}</div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={prompt.active ? 'default' : 'secondary'}>
                      {prompt.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {prompt.model_name} • T={prompt.temperature}
                    </span>
                    <ViewPromptDialogLink prompt={prompt} onDelete={onRefresh}>
                      {(openDialog) => (
                        <Button variant="outline" size="sm" onClick={openDialog} className="text-xs">
                          Modify
                        </Button>
                      )}
                    </ViewPromptDialogLink>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{prompt.text}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  Created {new Date(prompt.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptFamily;
