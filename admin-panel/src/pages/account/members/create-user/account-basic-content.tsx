import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserForm } from './components/create-user-form';

export function AccountCreateUserContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateUserForm />
      </CardContent>
    </Card>
  );
}
