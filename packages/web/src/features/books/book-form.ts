export interface BookFormValues {
  name: string;
  description: string;
  remarks: string;
}

export interface BookFormErrors {
  name?: string;
  description?: string;
}

export const emptyBookForm: BookFormValues = {
  name: '',
  description: '',
  remarks: '',
};

export function normalizeBookForm(values: BookFormValues): BookFormValues {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    remarks: values.remarks.trim(),
  };
}

export function validateBookForm(values: BookFormValues): BookFormErrors {
  const normalized = normalizeBookForm(values);
  const errors: BookFormErrors = {};

  if (!normalized.name) {
    errors.name = 'Author is required.';
  }

  if (!normalized.description) {
    errors.description = 'Title is required.';
  }

  return errors;
}
