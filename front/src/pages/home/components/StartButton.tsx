import { Play } from 'lucide-react';
import Button from '../../../common/components/Button';

export interface StartButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function StartButton({ disabled, loading, onClick }: StartButtonProps) {
  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      disabled={disabled}
      loading={loading}
      leftIcon={<Play className="h-4 w-4 fill-current" />}
      onClick={onClick}
    >
      {loading ? 'Расчёт...' : 'Начать расчёт'}
    </Button>
  );
}
