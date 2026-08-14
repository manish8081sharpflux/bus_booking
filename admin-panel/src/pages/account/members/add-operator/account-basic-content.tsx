import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddOperatorForm } from './components/add-operator-form';

export function AccountAddOperatorContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Operator</CardTitle>
      </CardHeader>
      <CardContent>
        <AddOperatorForm />
      </CardContent>
    </Card>
  );
}
