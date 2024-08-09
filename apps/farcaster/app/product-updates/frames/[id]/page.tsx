'use server';

import { getProductUpdatesFrame } from 'lib/product-updates/getFrame';

export default async function FramesPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  const { nextFrameId, previousFrameId, image, project } = await getProductUpdatesFrame(params.id);

  if (!previousFrameId && !nextFrameId) {
    return (
      <>
        <meta name='fc:frame' content='vNext' />
        <meta name='og:image' content={image} />
        <meta name='fc:frame:image' content={image} />
      </>
    );
  } else if (!previousFrameId && nextFrameId) {
    return (
      <>
        <meta name='fc:frame' content='vNext' />
        <meta name='og:image' content={image} />
        <meta name='fc:frame:image' content={image} />
        <meta name='fc:frame:button:1' content='Next' />
        <meta name='fc:frame:button:1:action' content='link' />
        <meta name='fc:frame:button:1:target' content={`https://connect.charmverse.io/frames/${nextFrameId}`} />
      </>
    );
  } else if (previousFrameId && !nextFrameId) {
    return (
      <>
        <meta name='fc:frame' content='vNext' />
        <meta name='og:image' content={image} />
        <meta name='fc:frame:image' content={image} />
        <meta name='fc:frame:button:1' content='Previous' />
        <meta name='fc:frame:button:1:action' content='link' />
        <meta name='fc:frame:button:1:target' content={`https://connect.charmverse.io/frames/${previousFrameId}`} />
      </>
    );
  }

  return (
    <>
      <meta name='fc:frame' content='vNext' />
      <meta name='og:image' content={image} />
      <meta name='fc:frame:image' content={image} />
      <meta name='fc:frame:button:1' content='Previous' />
      <meta name='fc:frame:button:1:action' content='link' />
      <meta name='fc:frame:button:1:target' content={`https://connect.charmverse.io/frames/${previousFrameId}`} />
      <meta name='fc:frame:button:2' content='Next' />
      <meta name='fc:frame:button:2:action' content='link' />
      <meta name='fc:frame:button:2:target' content={`https://connect.charmverse.io/frames/${nextFrameId}`} />
    </>
  );
}
