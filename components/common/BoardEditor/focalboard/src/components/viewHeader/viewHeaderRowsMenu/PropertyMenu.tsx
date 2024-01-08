import styled from '@emotion/styled';
import { Box, Menu, MenuItem, Tooltip } from '@mui/material';
import { usePopupState } from 'material-ui-popup-state/hooks';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';

import type { IPropertyTemplate, PropertyType } from 'lib/focalboard/board';
import type { Card } from 'lib/focalboard/card';

export const StyledMenuItem = styled(MenuItem)`
  border-left: 1px solid ${({ theme }) => theme.palette.divider};
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
  padding: ${({ theme }) => theme.spacing(0.5, 1)};
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  color: ${({ theme }) => theme.palette.text.primary};

  &:hover {
    background: ${({ theme }) => theme.palette.action.hover};
    transition: background 0.2s ease-in-out;
  }
`;

export function PropertyMenu({
  cards,
  disabledTooltip,
  propertyTemplate,
  children
}: {
  disabledTooltip?: string;
  cards: Card[];
  propertyTemplate: IPropertyTemplate<PropertyType>;
  children: ReactNode | ((option: { isPropertyOpen: boolean; closeMenu: VoidFunction }) => ReactNode);
}) {
  const popupState = usePopupState({ variant: 'popover' });
  // Without this state, the options menu list is not placed in the correct position
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <Tooltip title={disabledTooltip ?? ''}>
        <div>
          <StyledMenuItem
            disabled={!!disabledTooltip}
            ref={ref}
            onClick={() => {
              popupState.open();
              setTimeout(() => {
                setIsPropertyOpen(true);
              }, 150);
            }}
          >
            {propertyTemplate.name}
          </StyledMenuItem>
        </div>
      </Tooltip>

      <Menu
        anchorEl={ref.current}
        open={popupState.isOpen}
        style={{
          position: 'relative',
          top: -32,
          height: '100%'
        }}
        elevation={1}
        onClose={() => {
          popupState.close();
          setIsPropertyOpen(false);
        }}
      >
        <Box
          sx={{
            padding: '2px 4px',
            display: 'flex'
          }}
        >
          {typeof children === 'function' ? children({ isPropertyOpen, closeMenu: popupState.close }) : children}
        </Box>
      </Menu>
    </>
  );
}
