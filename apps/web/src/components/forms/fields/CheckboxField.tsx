import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';

interface CheckboxFieldProps {
	name: string;
	label: string;
	form: UseFormReturn<any>;
}

const CheckboxField = ({ name, label, form }: CheckboxFieldProps) => (
	<div className="flex items-center gap-x-2">
		<Checkbox id={name} checked={form.watch(name)} onCheckedChange={(checked) => form.setValue(name, checked)} />
		<Label htmlFor={name} className="text-sm">
			{label}
		</Label>
	</div>
);

export default CheckboxField;
