import type { CredentialEventType } from '@charmverse/core/prisma';
import { Box, FormControlLabel, Switch } from '@mui/material';

import { Typography } from 'components/common/Typography';

export type CredentialToggled = {
  credentialEvent: CredentialEventType;
  selected: boolean;
};

type ToggleProps = {
  onChange: (ev: CredentialToggled) => void;
  checked: boolean;
  disabled?: boolean;
  credentialEvent: CredentialEventType;
};

const labelMap: Record<CredentialEventType, string> = {
  proposal_created: 'Applied',
  proposal_approved: 'Approved'
};

const descriptionMap: Record<CredentialEventType, string> = {
  proposal_created: 'Issue when a proposal is published',
  proposal_approved: 'Issue when a proposal is approved'
};

export function CredentialEventToggle({ checked, onChange, disabled, credentialEvent }: ToggleProps) {
  return (
    <Box display='flex' justifyContent='flex-start' alignItems='center' gap={2}>
      <FormControlLabel
        sx={{
          margin: 0,
          display: 'flex',
          justifyContent: 'flex-start'
        }}
        control={
          <Box display='flex' gap={2} alignItems='center'>
            <Switch
              disabled={disabled}
              onChange={(ev) => {
                onChange({ credentialEvent, selected: !!ev.target.checked });
              }}
              checked={checked}
            />
          </Box>
        }
        label={
          <Typography fontWeight='bold' sx={{ minWidth: '100px' }}>
            {labelMap[credentialEvent]}
          </Typography>
        }
        labelPlacement='end'
      />
      <Typography>{descriptionMap[credentialEvent]}</Typography>
    </Box>
  );
}
