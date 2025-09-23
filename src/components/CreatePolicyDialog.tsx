import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const policySchema = z.object({
  policy_name: z.string().min(1, 'Policy name is required'),
  description: z.string().min(1, 'Description is required'),
  effective_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPolicyCreated: () => void;
}

export const CreatePolicyDialog = ({ open, onOpenChange, onPolicyCreated }: CreatePolicyDialogProps) => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policy_name: '',
      description: '',
      effective_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (values: PolicyFormValues) => {
    if (!employee) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a policy.' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('policies').insert([
      {
        ...values,
        created_by: employee.emp_id,
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error creating policy', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Policy created successfully.' });
      onPolicyCreated();
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>Fill in the details below to create a new company policy.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="policy_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Remote Work Policy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the policy..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effective_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
