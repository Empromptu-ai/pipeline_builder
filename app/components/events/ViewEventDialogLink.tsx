import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';

interface ViewEventDialogLinkProps {
  event: {
    inputs: Record<string, string>;
    response: string;
    score: number | string;
    score_explained?: Record<string, any>;
  };
  children: React.ReactNode;
}

const ViewEventDialogLink: React.FC<ViewEventDialogLinkProps> = ({ event, children }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer hover:bg-accent/50">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Inputs</label>
              <div className="space-y-2">
                {Object.entries(event.inputs).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-xs text-muted-foreground">{key}</div>
                    <div className="p-2 bg-muted rounded text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">AI Response</label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{event.response}</div>
            </div>
            <div>
              <label className="text-sm font-medium">Score: {Number(event.score).toFixed(1)}</label>
              {event.score_explained && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  {Object.entries(event.score_explained).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewEventDialogLink;
