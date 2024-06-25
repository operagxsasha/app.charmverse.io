import * as yup from 'yup';

import { CATEGORIES } from './constants';

export const schema = yup.object({
  name: yup.string().required('Project name is required'),
  description: yup.string(),
  avatar: yup.string(),
  cover: yup.string(),
  category: yup.string().oneOf(CATEGORIES),
  websites: yup.array(yup.string().required().url()),
  farcasterIds: yup.array(yup.string().required()),
  github: yup.string().url(),
  twitter: yup.string().url(),
  mirror: yup.string().url(),
  projectMembers: yup
    .array(
      yup.object({
        name: yup.string().required(),
        farcasterId: yup.number().required()
      })
    )
    .required()
    .min(1)
});

export type FormValues = yup.InferType<typeof schema>;
