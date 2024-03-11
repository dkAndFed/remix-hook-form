import React from "react";
import {
  FetcherWithComponents,
  SubmitFunction,
  useActionData,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  SubmitErrorHandler,
  SubmitHandler,
  useFormContext,
} from "react-hook-form";
import { useForm, FormProvider } from "react-hook-form";
import type {
  DefaultValues,
  FieldValues,
  FormState,
  KeepStateOptions,
  Path,
  RegisterOptions,
  UseFormHandleSubmit,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { createFormData } from "../utilities";

export type SubmitFunctionOptions = Parameters<SubmitFunction>[1];

export interface UseRemixFormOptions<T extends FieldValues>
  extends UseFormProps<T> {
  submitHandlers?: {
    onValid?: SubmitHandler<T>;
    onInvalid?: SubmitErrorHandler<T>;
  };
  submitConfig?: SubmitFunctionOptions;
  submitData?: FieldValues;
  fetcher?: FetcherWithComponents<unknown>;
  /**
   * If true, all values will be stringified before being sent to the server, otherwise everything but strings will be stringified (default: true)
   */
  stringifyAllValues?: boolean;
}

export const useRemixForm = <T extends FieldValues>({
  submitHandlers,
  submitConfig,
  submitData,
  fetcher,
  stringifyAllValues = true,
  ...formProps
}: UseRemixFormOptions<T>) => {
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] =
    React.useState(false);
  const actionSubmit = useSubmit();
  const actionData = useActionData();
  const submit = fetcher?.submit ?? actionSubmit;
  const data: any = fetcher?.data ?? actionData;
  const methods = useForm<T>({ ...formProps, errors: data?.errors });
  const navigation = useNavigation();
  // Either it's submitted to an action or submitted to a fetcher (or neither)
  const isSubmittingForm =
    navigation.state !== "idle" || (fetcher && fetcher.state !== "idle");

  // Submits the data to the server when form is valid
  const onSubmit = (data: T) => {
    setIsSubmittedSuccessfully(true);
    const formData = createFormData(
      { ...data, ...submitData },
      stringifyAllValues,
    );
    submit(formData, {
      method: "post",
      ...submitConfig,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onInvalid = () => {};

  // React-hook-form uses lazy property getters to avoid re-rendering when properties
  // that aren't being used change. Using getters here preservers that lazy behavior.
  const formState: FormState<T> = {
    get isDirty() {
      return methods.formState.isDirty;
    },
    get isLoading() {
      return methods.formState.isLoading;
    },
    get isSubmitted() {
      return methods.formState.isSubmitted;
    },
    get isSubmitSuccessful() {
      return isSubmittedSuccessfully || methods.formState.isSubmitSuccessful;
    },
    get isSubmitting() {
      return isSubmittingForm || methods.formState.isSubmitting;
    },
    get isValidating() {
      return methods.formState.isValidating;
    },
    get isValid() {
      return methods.formState.isValid;
    },
    get disabled() {
      return methods.formState.disabled;
    },
    get submitCount() {
      return methods.formState.submitCount;
    },
    get defaultValues() {
      return methods.formState.defaultValues;
    },
    get dirtyFields() {
      return methods.formState.dirtyFields;
    },
    get touchedFields() {
      return methods.formState.touchedFields;
    },
    get validatingFields() {
      return methods.formState.validatingFields;
    },
    get errors() {
      return methods.formState.errors;
    },
  };

  return {
    ...methods,
    handleSubmit: methods.handleSubmit(
      submitHandlers?.onValid ?? onSubmit,
      submitHandlers?.onInvalid ?? onInvalid,
    ),
    reset: (
      values?: T | DefaultValues<T> | undefined,
      options?: KeepStateOptions,
    ) => {
      setIsSubmittedSuccessfully(false);
      methods.reset(values, options);
    },
    register: (
      name: Path<T>,
      options?: RegisterOptions<T> & {
        disableProgressiveEnhancement?: boolean;
      },
    ) => ({
      ...methods.register(name, options),
      ...(!options?.disableProgressiveEnhancement && {
        defaultValue: data?.defaultValues?.[name] ?? "",
      }),
    }),
    formState,
  };
};
interface RemixFormProviderProps<T extends FieldValues>
  extends Omit<UseFormReturn<T>, "handleSubmit" | "reset"> {
  children: React.ReactNode;
  handleSubmit: any;
  register: any;
  reset: any;
}
export const RemixFormProvider = <T extends FieldValues>({
  children,
  ...props
}: RemixFormProviderProps<T>) => {
  return <FormProvider {...props}>{children}</FormProvider>;
};

export const useRemixFormContext = <T extends FieldValues>() => {
  const methods = useFormContext<T>();
  return {
    ...methods,
    handleSubmit: methods.handleSubmit as any as ReturnType<
      UseFormHandleSubmit<T>
    >,
  };
};
