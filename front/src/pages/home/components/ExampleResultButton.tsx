import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../common/components/Button';
import { ROUTES } from '../../../router/routes';

export default function ExampleResultButton() {
  return (
    <Link to={ROUTES.example} className="block">
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        leftIcon={<Eye className="h-4 w-4" />}
      >
        Пример результата
      </Button>
    </Link>
  );
}
