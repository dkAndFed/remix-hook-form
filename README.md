# remix-hook-form

![GitHub Repo stars](https://img.shields.io/github/stars/forge-42/remix-hook-form?style=social)
![npm](https://img.shields.io/npm/v/remix-hook-form?style=plastic)
![GitHub](https://img.shields.io/github/license/forge-42/remix-hook-form?style=plastic)
![npm](https://img.shields.io/npm/dy/remix-hook-form?style=plastic) 
![npm](https://img.shields.io/npm/dw/remix-hook-form?style=plastic) 
![GitHub top language](https://img.shields.io/github/languages/top/forge-42/remix-hook-form?style=plastic) 

Remix-hook-form is a powerful and lightweight wrapper around [react-hook-form](https://react-hook-form.com/) that streamlines the process of working with forms and form data in your [React Router](https://reactrouter.com) applications. With a comprehensive set of hooks and utilities, you'll be able to easily leverage the flexibility of react-hook-form without the headache of boilerplate code.

And the best part? Remix-hook-form has zero dependencies, making it easy to integrate into your existing projects and workflows. Say goodbye to bloated dependencies and hello to a cleaner, more efficient development process with Remix-hook-form. 

Oh, and did we mention that this is fully Progressively enhanced? That's right, you can use this with or without javascript!

## Remix.run support
Versions older than 6.0.0 are compatible with [Remix.run](https://remix.run) applications. If you are using Remix.run, please use version 5.1.1 or lower.

## Install

```bash
npm install remix-hook-form react-hook-form
```

## Basic usage

Here is an example usage of remix-hook-form. It will work with **and without** JS. Before running the example, ensure to install additional dependencies:

```bash
npm install zod @hookform/resolvers
```

```ts
import { useRemixForm, getValidatedFormData } from "remix-hook-form";
import { Form } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import type { Route } from "./+types/home";


const schema = zod.object({
  name: zod.string().min(1),
  email: zod.string().email().min(1),
});

type FormData = zod.infer<typeof schema>;

const resolver = zodResolver(schema);

export const action = async ({ request }: Route.ActionArgs) => {
  const { errors, data, receivedValues: defaultValues } =
    await getValidatedFormData<FormData>(request, resolver);
  if (errors) {
    // The keys "errors" and "defaultValues" are picked up automatically by useRemixForm
    return { errors, defaultValues };
  }

  // Do something with the data
  return data;
};

export default function MyForm() {
  const {
    handleSubmit,
    formState: { errors },
    register,
  } = useRemixForm<FormData>({
    mode: "onSubmit",
    resolver,
  });

  return (
    <Form onSubmit={handleSubmit} method="POST">
      <label>
        Name:
        <input type="text" {...register("name")} />
        {errors.name && <p>{errors.name.message}</p>}
      </label>
      <label>
        Email:
        <input type="email" {...register("email")} />
        {errors.email && <p>{errors.email.message}</p>}
      </label>
      <button type="submit">Submit</button>
    </Form>
  );
}
```

## Serialization of values client => server

By default, all values are serialized to strings before being sent to the server. This is because that is how form data works, it only accepts strings, nulls or files, this means that even strings would get "double stringified" and become strings like this:
```ts
const string = "'123'";
```
This helps with the fact that validation on the server can't know if your stringified values received from the client are actually strings or numbers or dates or whatever.

For example, if you send this formData to the server:

```ts
const formData = {
  name: "123",
  age: 30,
  hobbies: ["Reading", "Writing", "Coding"],
  boolean: true,
  a: null,
  // this gets omitted because it's undefined
  b: undefined,
  numbers: [1, 2, 3],
  other: {
    skills: ["testing", "testing"],
    something: "else",
  },
};
```

It would be sent to the server as:
```ts
{
  name: "123",
  age: "30",
  hobbies: "[\"Reading\",\"Writing\",\"Coding\"]",
  boolean: "true",
  a: "null",
  numbers: "[1,2,3]",
  other: "{\"skills\":[\"testing\",\"testing\"],\"something\":\"else\"}",
}
```

Then the server does not know if the `name` property used to be a string or a number, your validation schema would fail if it parsed it back to a number and you expected it to be a string. Conversely, if you didn't parse the rest of this data you wouldn't have objects,
arrays etc. but strings. 

The double stringification helps with this as it would correctly parse the data back to the original types, but it also means that you have to use the helpers provided by this package to parse the data back to the original types.



This is the default behavior, but you can change this behavior by setting the `stringifyAllValues` prop to `false` in the `useRemixForm` hook.

```ts
const { handleSubmit, formState, register } = useRemixForm({
  mode: "onSubmit",
  resolver,
  stringifyAllValues: false,
});
```

This only affects strings really as it either double stringifies them or it doesn't. The bigger impact of all of this is on the server side.

By default all the server helpers expect the data to be double stringified which allows the utils to parse the data back to the original types easily. If you don't want to double stringify the data then you can set the `preserveStringified` prop to `true` in the `getValidatedFormData` function.

```ts
// Third argument is preserveStringified and is false by default
const { errors, data } = await getValidatedFormData(request, resolver, true);
```
Because the data by default is double stringified the data returned by the util and sent to your validator would look like this:

```ts
const data = {
  name: "123",
  age: 30,
  hobbies: ["Reading", "Writing", "Coding"],
  boolean: true,
  a: null,
  // this gets omitted because it's undefined
  b: undefined,
  numbers: [1, 2, 3],
  other: {
    skills: ["testing", "testing"],
    something: "else",
  },
};
```

If you set `preserveStringified` to `true` then the data would look like this:

```ts
const data = {
  name: "123",
  age: "30",
  hobbies: ["Reading", "Writing", "Coding"],
  boolean: "true",
  a: "null",
  numbers: ["1","2","3"],
  other: {
    skills: ["testing", "testing"],
    something: "else",
  },
};

```

This means that your validator would have to handle all the type conversions and validations for all the different types of data. This is a lot of work and it's not worth it usually, the best place to use this approach if you store the info in searchParams. If you want to handle it like this what you can do is use something like `coerce` from `zod` to convert the data to the correct type before checking it.

```ts
import { z } from "zod";

const formDataZodSchema = z.object({
  name: z.string().min(1),
  // converts the string to a number
  age: z.coerce.number().int().positive(), 
});

type SchemaFormData = z.infer<typeof formDataZodSchema>;

const resolver = zodResolver(formDataZodSchema);

export const action = async ({ request }: Route.ActionArgs) => {
  const { errors, data } = await getValidatedFormData<SchemaFormData>(
    request,
    resolver,
    true,
  );
  if (errors) {
    return { errors };
  }
  // Do something with the data
};
```

 

## Fetcher usage

You can pass in a fetcher as an optional prop and `useRemixForm` will use that fetcher to submit the data and read the errors instead of the default behavior. For more info see the docs on `useRemixForm` below.


## Video example and tutorial

If you wish to learn in depth on how form handling works in React router/Remix.run and want an example using this package I have prepared a video tutorial on how to do it. It's a bit long but it covers everything 
you need to know about form handling in React Router/Remix. It also covers how to use this package. You can find it here:

https://youtu.be/iom5nnj29sY?si=l52WRE2bqpkS2QUh


## API's

### getValidatedFormData

Now supports no-js form submissions!

If you made a GET request instead of a POST request and you are using this inside of a loader it will try to extract the data from the search params

If the form is submitted without js it will try to parse the formData object and covert it to the same format as the data object returned by `useRemixForm`. If the form is submitted with js it will automatically extract the data from the request object and validate it.

getValidatedFormData is a utility function that can be used to validate form data in your action. It takes two arguments: the request/formData object and the resolver function. It returns an object with three properties: `errors`, `receivedValues` and `data`. If there are no errors, `errors` will be `undefined`. If there are errors, `errors` will be an object with the same shape as the `errors` object returned by `useRemixForm`. If there are no errors, `data` will be an object with the same shape as the `data` object returned by `useRemixForm`.

The `receivedValues` property allows you to set the default values of your form to the values that were received from the request object. This is useful if you want to display the form again with the values that were submitted by the user when there is no JS present
 
 #### Example with errors only
 If you don't want the form to persist submitted values in the case of validation errors then you can just return the `errors` object directly from the action.
```jsx
/** all the same code from above */

export const action = async ({ request }: Route.ActionArgs) => {
  // Takes the request from the frontend, parses and validates it and returns the data
  const { errors, data } =
    await getValidatedFormData<FormData>(request, resolver);
  if (errors) {
    return { errors };
  }
  // Do something with the data
};
```

#### Example with errors and receivedValues
If your action returrns `defaultValues` key then it will be automatically used by `useRemixForm` to populate the default values of the form.
```jsx
/** all the same code from above */

export const action = async ({ request }: Route.ActionArgs) => {
  // Takes the request from the frontend, parses and validates it and returns the data
  const { errors, data, receivedValues: defaultValues } =
    await getValidatedFormData<FormData>(request, resolver);
  if (errors) {
    return { errors, defaultValues };
  }
  // Do something with the data
};

```

### validateFormData

validateFormData is a utility function that can be used to validate form data in your action. It takes two arguments: the formData object and the resolver function. It returns an object with two properties: `errors` and `data`. If there are no errors, `errors` will be `undefined`. If there are errors, `errors` will be an object with the same shape as the `errors` object returned by `useRemixForm`. If there are no errors, `data` will be an object with the same shape as the `data` object returned by `useRemixForm`.

The difference between `validateFormData` and `getValidatedFormData` is that `validateFormData` only validates the data while the `getValidatedFormData` function also extracts the data automatically from the request object assuming you were using the default setup.

```jsx
/** all the same code from above */

export const action = async ({ request }: Route.ActionArgs) => {
  // Lets assume you get the data in a different way here but still want to validate it
  const formData = await yourWayOfGettingFormData(request);
  // Takes the request from the frontend, parses and validates it and returns the data
  const { errors, data } =
    await validateFormData<FormData>(formData, resolver);
  if (errors) {
    return { errors };
  }
  // Do something with the data
};

```

### createFormData

createFormData is a utility function that can be used to create a FormData object from the data returned by the handleSubmit function from `react-hook-form`. It takes one argument, the `data` from the `handleSubmit` function and it converts everything it can to strings and appends files as well. It returns a FormData object.

```jsx
/** all the same code from above */

export default function MyForm() {
  const { ... } = useRemixForm({
    ...,
    submitHandlers: {
      onValid: data => {
        // This will create a FormData instance ready to be sent to the server, by default all your data is converted to a string before sent
        const formData = createFormData(data); 
        // Do something with the formData
      }
    }
  });

  return (
   ...
  );
}

```

### parseFormData

parseFormData is a utility function that can be used to parse the data submitted to the action by the handleSubmit function from `react-hook-form`. It takes two arguments, first one is the `request` submitted from the frontend and the second one is `preserveStringified`, the form data you submit will be cast to strings because that is how form data works, when retrieving it you can either keep everything as strings or let the helper try to parse it back to original types (eg number to string), default is `false`. It returns an object that contains unvalidated `data` submitted from the frontend.


```jsx
/** all the same code from above */

export const action = async ({ request }: Route.ActionArgs) => {
  // Allows you to get the data from the request object without having to validate it
  const formData = await parseFormData(request);
  // formData.age will be a number
  const formDataStringified = await parseFormData(request, true);
  // formDataStringified.age will be a string
  // Do something with the data
};

```

### getFormDataFromSearchParams

If you're using a GET request formData is not available on the request so you can use this method to extract your formData from the search parameters assuming you set all your data in the search parameters

## Hooks

### useRemixForm

`useRemixForm` is a hook that can be used to create a form in your React Router / Remix application. It's basically the same as react-hook-form's [`useForm`](https://www.react-hook-form.com/api/useform/) hook, with the following differences:

**Additional options**
- `submitHandlers`: an object containing two properties:
  - `onValid`: can be passed into the function to override the default behavior of the `handleSubmit` success case provided by the hook. If you need to pass additional data not tracked in the form, you'll need to manually merge it here with your form data to be submitted, as the `submitData` hook option is ignored in this case.
  - `onInvalid`: can be passed into the function to override the default behavior of the `handleSubmit` error case provided by the hook.
- `submitConfig`: allows you to pass additional configuration to the `useSubmit` function from React Router / Remix, such as `{ replace: true }` to replace the current history entry instead of pushing a new one. The `submitConfig` trumps `Form` props from React Router / Remix. The following props will be used from `Form` if no submitConfig is provided:
  - `method`
  - `action`
  - `encType`
- `submitData`: allows you to pass additional data to the backend when the form is submitted.
- `fetcher`: if provided then this fetcher will be used to submit data and get a response (errors / defaultValues) instead of React Router/Remix's `useSubmit` and `useActionData` hooks.

**`register` will respect default values returned from the action**

If the React Router/Remix hook `useActionData` returns an object with `defaultValues` these will automatically be used as the default value when calling the `register` function. This is useful when the form has errors and you want to persist the values when JS is not enabled. If a `fetcher` is provided default values will be read from the fetcher's data.

**`handleSubmit`**

The returned `handleSubmit` function does two additional things
- The success case is provided by default where when the form is validated by the provided resolver, and it has no errors, it will automatically submit the form to the current route using a POST request. The data will be sent as `formData` to the action function.
- The data that is sent is automatically wrapped into a formData object and passed to the server ready to be used. Easiest way to consume it is by using the `parseFormData` or `getValidatedFormData` function from the `remix-hook-form` package.

**`formState.errors`**

The `errors` object inside `formState` is automatically populated with the errors returned by the action. If the action returns an `errors` key in it's data then that value will be used to populate errors, otherwise the whole action response is assumed to be the errors object. If a `fetcher` is provided then errors are read from the fetcher's data.

#### Examples

**Overriding the default onValid and onInvalid cases**

```jsx
  const { ... } = useRemixForm({
    ...ALL_THE_SAME_CONFIG_AS_REACT_HOOK_FORM,
    submitHandlers: {
      onValid: data => { 
        // Do something with the formData
      },
      onInvalid: errors => {
        // Do something with the errors
      }
    }
  });

```

**Overriding the submit from remix to do something else**

```jsx
  const { ... } = useRemixForm({
    ...ALL_THE_SAME_CONFIG_AS_REACT_HOOK_FORM,
    submitConfig: {
      replace: true,
      method: "PUT",
      action: "/api/youraction",
    },
  });

```

**Passing additional data to the backend**

```jsx
  const { ... } = useRemixForm({
    ...ALL_THE_SAME_CONFIG_AS_REACT_HOOK_FORM,
    submitData: {
      someFieldsOutsideTheForm: "someValue"
    },
  });

  // or if customizing with `onValid` handler
  const { ... } = useRemixForm({
    ...ALL_THE_SAME_CONFIG_AS_REACT_HOOK_FORM,
    submitHandlers: {
      onValid: data => { 
        const mergedData = { ...data, someFieldsOutsideTheForm: "someValue" }
        const formData = createFormData(mergedData);
        // ... submit
      }
    }
  });
```

### RemixFormProvider

Identical to the [`FormProvider`](https://react-hook-form.com/api/formprovider/) from `react-hook-form`, but it also returns the changed `formState.errors` and `handleSubmit` object.
```jsx
export default function Form() {
  const methods = useRemixForm();
 
  return (
    <RemixFormProvider {...methods} > // pass all methods into the context
      <form onSubmit={methods.handleSubmit}>
        <button type="submit" />
      </form>
    </RemixFormProvider>
  );
}

```

### useRemixFormContext

Exactly the same as [`useFormContext`](https://react-hook-form.com/api/useformcontext/) from `react-hook-form` but it also returns the changed `formState.errors` and `handleSubmit` object.

```jsx
export default function Form() {
  const methods = useRemixForm();
 

  return (
    <RemixFormProvider {...methods} > // pass all methods into the context
      <form onSubmit={methods.handleSubmit}>
        <NestedInput />
        <button type="submit" />
      </form>
    </RemixFormProvider>
  );
}

const NestedInput = () => {
  const { register } = useRemixFormContext(); // retrieve all hook methods
  return <input {...register("test")} />;
}

```


## Support 

If you like the project, please consider supporting us by giving a ⭐️ on Github.
## License

MIT

## Bugs

If you find a bug, please file an issue on [our issue tracker on GitHub](https://github.com/Code-Forge-Net/remix-hook-form/issues)


## Contributing

Thank you for considering contributing to Remix-hook-form! We welcome any contributions, big or small, including bug reports, feature requests, documentation improvements, or code changes.

To get started, please fork this repository and make your changes in a new branch. Once you're ready to submit your changes, please open a pull request with a clear description of your changes and any related issues or pull requests.

Please note that all contributions are subject to our [Code of Conduct](https://github.com/Code-Forge-Net/remix-hook-form/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

We appreciate your time and effort in contributing to Remix-hook-form and helping to make it a better tool for the community!

