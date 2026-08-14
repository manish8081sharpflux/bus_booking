import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSignupSchema, SignupSchemaType } from '@/auth/forms/signup-schema';

export function CreateUserForm() {
  const { register } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(getSignupSchema()),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'USER',
      adminCreationKey: '',
    },
  });

  const selectedRole = form.watch('role');

  async function onSubmit(values: SignupSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccessMessage(null);

      await register({
        name: values.name.trim(),
        mobile: values.mobile.trim(),
        email: values.email?.trim() || undefined,
        password: values.password,
        role: values.role,
        adminCreationKey: values.adminCreationKey?.trim() || undefined,
      });

      setSuccessMessage('User created successfully.');
      form.reset({
        name: '',
        mobile: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'USER',
        adminCreationKey: '',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while creating the user.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="block w-full space-y-5">
        {error && (
          <Alert
            variant="destructive"
            appearance="light"
            onClose={() => setError(null)}
          >
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {successMessage && (
          <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter mobile number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter email address"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedRole === 'ADMIN' && (
          <FormField
            control={form.control}
            name="adminCreationKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Creation Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter admin creation key"
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <Input
                  placeholder="Create a password"
                  type={passwordVisible ? 'text' : 'password'}
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {passwordVisible ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <div className="relative">
                <Input
                  placeholder="Confirm password"
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() =>
                    setConfirmPasswordVisible(!confirmPasswordVisible)
                  }
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {confirmPasswordVisible ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Creating user...
            </span>
          ) : (
            'Create User'
          )}
        </Button>
      </form>
    </Form>
  );
}
