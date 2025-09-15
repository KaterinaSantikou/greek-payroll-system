import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Save, X } from 'lucide-react';

interface SimpleEmployee {
  employeeId?: string;
  name: string;
  employeeNumber: string;
  role?: string;
  employmentType: string;
  hireDate: string;
  afm?: string;
  defaultPropertyId?: string;
}

interface SimpleEmployeeFormProps {
  employee?: SimpleEmployee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SimpleEmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: SimpleEmployeeFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SimpleEmployee>({
    defaultValues: employee || {
      name: '',
      employeeNumber: '',
      role: '',
      employmentType: 'indefinite',
      hireDate: new Date().toISOString().split('T')[0],
      afm: '',
      defaultPropertyId: 'prop-princess',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SimpleEmployee) => {
      const url = employee
        ? `/api/employees/${employee.employeeId}`
        : '/api/employees';
      const method = employee ? 'PUT' : 'POST';
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: 'Επιτυχία',
        description: employee
          ? 'Ο εργαζόμενος ενημερώθηκε επιτυχώς'
          : 'Ο εργαζόμενος δημιουργήθηκε επιτυχώς',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Σφάλμα',
        description: error.message || 'Παρουσιάστηκε σφάλμα',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SimpleEmployee) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ονοματεπώνυμο *</Label>
            <Input
              id="name"
              {...register('name', {
                required: 'Το ονοματεπώνυμο είναι υποχρεωτικό',
              })}
              placeholder="π.χ. Γιάννης Παπαδόπουλος"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeNumber">Αριθμός Εργαζομένου *</Label>
            <Input
              id="employeeNumber"
              {...register('employeeNumber', {
                required: 'Ο αριθμός εργαζομένου είναι υποχρεωτικός',
              })}
              placeholder="π.χ. EMP-001"
            />
            {errors.employeeNumber && (
              <p className="text-sm text-red-600">
                {errors.employeeNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Θέση Εργασίας *</Label>
            <Input
              id="role"
              {...register('role', {
                required: 'Η θέση εργασίας είναι υποχρεωτική',
              })}
              placeholder="π.χ. Υπάλληλος Υποδοχής"
            />
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employmentType">Τύπος Απασχόλησης *</Label>
            <Select defaultValue="indefinite">
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinite">Αορίστου Χρόνου</SelectItem>
                <SelectItem value="fixed-term">Ορισμένου Χρόνου</SelectItem>
                <SelectItem value="seasonal">Εποχιακή</SelectItem>
                <SelectItem value="part-time">Μερική Απασχόληση</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hireDate">Ημερομηνία Πρόσληψης *</Label>
            <Input
              id="hireDate"
              type="date"
              {...register('hireDate', {
                required: 'Η ημερομηνία πρόσληψης είναι υποχρεωτική',
              })}
            />
            {errors.hireDate && (
              <p className="text-sm text-red-600">{errors.hireDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="afm">ΑΦΜ</Label>
            <Input
              id="afm"
              {...register('afm')}
              placeholder="π.χ. 123456789"
              maxLength={9}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Ακύρωση
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </div>
      </form>
    </div>
  );
}
