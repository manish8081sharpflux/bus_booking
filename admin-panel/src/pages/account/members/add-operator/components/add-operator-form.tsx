import { useState } from 'react';
import { Link } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  registerOperator,
  sendOperatorOtp,
  verifyOperatorOtp,
} from '../../operators/services/operator-api';

const addOperatorSchema = z.object({
  operatorName: z.string().trim().min(1, 'Operator name is required'),
  ownerName: z.string().trim().min(1, 'Owner name is required'),
  mobile: z.string().trim().min(10, 'Please enter a valid mobile number'),
  otp: z.string().trim().min(4, 'Please enter OTP'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});

type AddOperatorSchemaType = z.infer<typeof addOperatorSchema>;

export function AddOperatorForm() {
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<AddOperatorSchemaType>({
    resolver: zodResolver(addOperatorSchema),
    defaultValues: {
      operatorName: '',
      ownerName: '',
      mobile: '',
      otp: '',
      email: '',
      address: '',
    },
  });

  const mobile = form.watch('mobile');

  async function onSendOtp() {
    try {
      const mobileValue = form.getValues('mobile').trim();

      if (!mobileValue) {
        form.setError('mobile', { message: 'Mobile number is required' });
        return;
      }

      setIsSendingOtp(true);
      setError(null);
      setSuccessMessage(null);
      setIsOtpVerified(false);

      const message = await sendOperatorOtp(mobileValue);
      setSuccessMessage(message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send OTP. Please try again.',
      );
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function onVerifyOtp() {
    try {
      const mobileValue = form.getValues('mobile').trim();
      const otpValue = form.getValues('otp').trim();

      if (!mobileValue) {
        form.setError('mobile', { message: 'Mobile number is required' });
        return;
      }

      if (!otpValue) {
        form.setError('otp', { message: 'OTP is required' });
        return;
      }

      setIsVerifyingOtp(true);
      setError(null);
      setSuccessMessage(null);

      const message = await verifyOperatorOtp(mobileValue, otpValue);
      setIsOtpVerified(true);
      setSuccessMessage(message);
    } catch (err) {
      setIsOtpVerified(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to verify OTP. Please try again.',
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function onSubmit(values: AddOperatorSchemaType) {
    if (!isOtpVerified) {
      setError('Verify OTP first before registering the operator.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      await registerOperator({
        operatorName: values.operatorName.trim(),
        ownerName: values.ownerName.trim(),
        mobile: values.mobile.trim(),
        email: values.email?.trim() || undefined,
        address: values.address?.trim() || undefined,
      });

      setSuccessMessage('Operator registered successfully.');
      setIsOtpVerified(false);
      form.reset({
        operatorName: '',
        ownerName: '',
        mobile: '',
        otp: '',
        email: '',
        address: '',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while registering the operator.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
          name="operatorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operator Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter operator name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter owner name" {...field} />
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

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OTP</FormLabel>
                <FormControl>
                  <Input placeholder="Enter OTP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSendOtp}
              disabled={isSendingOtp || !mobile.trim()}
            >
              {isSendingOtp ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Send OTP
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onVerifyOtp}
              disabled={isVerifyingOtp || !mobile.trim()}
            >
              {isVerifyingOtp ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Verify OTP
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter email" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter address" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting || !isOtpVerified}>
            {isSubmitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Register Operator
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/account/members/operators">View Operators</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
