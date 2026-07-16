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
      variant="cta"
      className="mt-[26px]"
      disabled={disabled}
      loading={loading}
      leftIcon={<Play className="h-[15px] w-[15px] fill-current" />}
      onClick={onClick}
    >
      {loading ? 'Расчёт...' : 'Начать расчёт'}
    </Button>
  );
}
