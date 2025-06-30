# React Hook Form Usage Guide

This project uses `react-hook-form` with Zod validation for form handling instead of manual `useState` management.

## Why React Hook Form?

- **Better Performance**: No re-renders on every keystroke
- **Built-in Validation**: Integrated with Zod schemas
- **Less Boilerplate**: No manual state management
- **Better UX**: Field-level validation and error handling
- **Form State Management**: Built-in dirty, touched, loading states

## Basic Setup

### 1. Create Zod Schema

Define your form schema in `/src/schemas/forms.ts`:

```typescript
import { z } from "zod";

export const myFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type MyFormData = z.infer<typeof myFormSchema>;
```

### 2. Setup the Form Component

```tsx
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { myFormSchema, type MyFormData } from "@/schemas/forms";

const MyFormComponent: React.FC = () => {
  // Initialize form with react-hook-form
  const form = useForm<MyFormData>({
    resolver: zodResolver(myFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: MyFormData) => {
    // Handle form submission
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          Submit
        </Button>
      </form>
    </Form>
  );
};
```

## Available Form States

React Hook Form provides several useful form states:

- `form.formState.isValid` - Whether form is valid
- `form.formState.isSubmitting` - Whether form is being submitted
- `form.formState.isDirty` - Whether form has been modified
- `form.formState.errors` - Field-level errors
- `form.formState.touchedFields` - Fields that have been interacted with

## Form Field Types

### Text Input

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input placeholder="Placeholder" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select Dropdown

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Accept terms</FormLabel>
      </div>
    </FormItem>
  )}
/>
```

## Migration from useState

### Before (with useState):

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

<Input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Email"
/>;
```

### After (with react-hook-form):

```tsx
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { email: "", password: "" },
});

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="Email" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>;
```

## Converted Forms

The following forms have been converted to use react-hook-form:

- ✅ **SignUp** (`/src/pages/SignUp.tsx`)
- ✅ **SignIn** (`/src/pages/SignIn.tsx`)
- ✅ **AcceptInvitation** (`/src/pages/AcceptInvitation.tsx`)
- ✅ **FeedbackForm** (`/src/components/FeedbackForm.tsx`)
- ✅ **AddQueueForm** (`/src/components/AddQueueForm.tsx`) - Fully converted with all advanced options
- ✅ **AddServerForm** (`/src/components/AddServerForm/AddServerForm.tsx`) - Fully converted with SSL configuration
- ✅ **SendMessageDialog** (`/src/components/SendMessageDialog.tsx`) - Fully converted with all form fields using FormField pattern

## Best Practices

1. **Always use Zod schemas** for form validation
2. **Define TypeScript types** from Zod schemas using `z.infer<>`
3. **Use FormField components** instead of raw inputs
4. **Handle loading states** with `form.formState.isSubmitting`
5. **Use form.formState.isValid** for submit button disabled state
6. **Keep form schemas in `/src/schemas/forms.ts`**
7. **Use meaningful default values** in `useForm` setup

## Dependencies

- `react-hook-form` - Form state management
- `@hookform/resolvers` - Resolvers for various validation libraries
- `zod` - Schema validation
- `@/components/ui/form` - UI form components from shadcn/ui
