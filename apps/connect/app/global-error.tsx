'use client';

import { log } from '@charmverse/core/log';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';

import Bolt from 'public/images/lightning_bolt.svg';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    log.error('Uncaught error:', error);
  }, [error]);

  return (
    <html lang='en'>
      <body>
        <Box
          height='100vh'
          width='100%'
          display='flex'
          alignItems='center'
          justifyContent='center'
          overflow='hidden'
          flexDirection='column'
          gap={5}
        >
          <Bolt />
          <Typography variant='subtitle1'>Sorry! there was an error</Typography>
          <Button onClick={reset}>Try again</Button>
        </Box>
      </body>
    </html>
  );
}
