import { MoreVertical, LucideIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ReactNode } from 'react';

export interface ActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

interface ActionDropdownProps {
  actions: ActionItem[];
  trigger?: ReactNode;
  disabled?: boolean;
}

export function ActionDropdown({ actions, trigger, disabled }: ActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-white border-border hover:bg-muted transition-colors"
            disabled={disabled}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            className={`${action.destructive ? 'text-destructive focus:text-destructive' : ''} cursor-pointer`}
            onClick={action.onClick}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Specialized component for the common Edit/Delete pattern with Alert Dialog
interface EntityActionsProps {
  onDelete: () => void;
  deleteTitle: string;
  deleteDescription: string;
  extraActions?: ActionItem[];
  disabled?: boolean;
}

export function EntityActions({ onDelete, deleteTitle, deleteDescription, extraActions = [], disabled }: EntityActionsProps) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-white border-border hover:bg-muted transition-colors"
            disabled={disabled}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white">
          {extraActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              className="cursor-pointer"
              onClick={action.onClick}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent className="clean-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-[#ef4444] text-white hover:bg-[#dc2626] rounded-xl"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
