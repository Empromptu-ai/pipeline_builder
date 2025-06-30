import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';

interface ViewEventCompareDialogLinkProps {
  event: {
    inputs: Record<string, string>;
    response: string;
    score: number | string;
    origResponse?: string;
    origScore?: number | string;
  };
  children: React.ReactNode;
}

const ViewEventCompareDialogLink: React.FC<ViewEventCompareDialogLinkProps> = ({ event, children }) => {
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
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Compare Results</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="flex-shrink-0">
              <h3 className="text-lg font-medium mb-3">Inputs</h3>
              <div className="space-y-3">
                {Object.entries(event.inputs).map(([key, value]) => (
                  <div key={key} className="border rounded-md p-3 bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-1">{key}</div>
                    <div className="text-sm text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Original AI Response</h3>
                  <div className="text-sm font-medium">
                    Score:{' '}
                    <span className="text-lg">{event.origScore ? Number(event.origScore).toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
                <div className="border rounded-md p-4 bg-red-50 max-h-80 overflow-y-auto">
                  <div className="text-sm whitespace-pre-wrap">{event.origResponse || 'N/A'}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">New AI Response</h3>
                  <div className="text-sm font-medium">
                    Score: <span className="text-lg">{Number(event.score).toFixed(1)}</span>
                  </div>
                </div>
                <div className="border rounded-md p-4 bg-green-50 max-h-80 overflow-y-auto">
                  <div className="text-sm whitespace-pre-wrap">{event.response}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewEventCompareDialogLink;
