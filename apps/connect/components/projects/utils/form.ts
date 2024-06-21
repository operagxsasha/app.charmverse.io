import * as yup from 'yup';

import { CATEGORIES } from './constants';

export const schema = yup.object({
  name: yup.string().required('Project name is required'),
  description: yup.string(),
  avatar: yup.string(),
  cover: yup.string(),
  category: yup.string().required().oneOf(CATEGORIES),
  website: yup.array(yup.string().required().url()),
  farcaster: yup.array(yup.string().required()),
  github: yup.string().url(),
  twitter: yup.string().url(),
  mirror: yup.string().url()
});

export type FormValues = yup.InferType<typeof schema>;
