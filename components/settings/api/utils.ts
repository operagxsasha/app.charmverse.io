import { WebhookEventNames, WebhookNameSpaceNames } from 'serverless/webhook/interfaces';
import * as yup from 'yup';

export type WebhookNamespaces = { [key: string]: string[] };
const WEBHOOK_EVENT_NAMES = Object.keys(WebhookEventNames);
const WEBHOOK_EVENT_NAMESPACES = Object.keys(WebhookNameSpaceNames);

// generate an object that contains every namespace and the event attached to them
// Auto generated out of the types so the form is dynamic if we decide to add more events
export const getOrderedWebhookSubscriptionOptions = (): WebhookNamespaces => {
  const orderedNamespaces: WebhookNamespaces = {};

  for (const event of WEBHOOK_EVENT_NAMES) {
    const [nameSpace] = event.split('.');
    orderedNamespaces[nameSpace] = [...orderedNamespaces[nameSpace], event];
  }

  return orderedNamespaces;
};

export const getWebhookNameSpaceYupSchema = () => {
  const schema = yup.object(
    WEBHOOK_EVENT_NAMESPACES.reduce(
      (prev, current) => ({
        ...prev,
        [current]: yup.bool().nullable(false)
      }),
      {}
    )
  );

  return schema;
};
