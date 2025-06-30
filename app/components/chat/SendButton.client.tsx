import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import { ArrowRight, StopCircle } from 'lucide-react';

interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export function SendButton({ show, isStreaming, onClick }: SendButtonProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          className="absolute flex justify-center items-center top-[18px] right-[22px] p-1 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-md w-[34px] h-[34px] transition-theme"
          transition={{ ease: customEasingFn, duration: 0.17 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
        >
          <div className="text-lg">{!isStreaming ? <ArrowRight /> : <StopCircle />}</div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
