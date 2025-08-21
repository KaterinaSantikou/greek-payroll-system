import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function MobileActionSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className 
}: MobileActionSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-background border-t border-border",
              "rounded-t-xl shadow-lg",
              "max-h-[80vh] overflow-hidden",
              className
            )}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ActionSheetItemProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
  className?: string;
}

export function ActionSheetItem({ 
  icon, 
  title, 
  description, 
  onClick, 
  destructive = false,
  className 
}: ActionSheetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-4 text-left",
        "hover:bg-muted transition-colors",
        "min-h-[56px]", // Touch target
        destructive && "text-destructive",
        className
      )}
    >
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}