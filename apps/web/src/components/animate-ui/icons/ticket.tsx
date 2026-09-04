'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

/**
 * Hand-written to match the animate-ui icon contract: the registry ships no
 * `ticket`, and the sidebar entry needed the same hover behaviour as its
 * neighbours. Geometry is lucide's `ticket` (ISC), so the glyph is unchanged.
 *
 * The three perforation dashes punch in one after the other, like a ticket
 * being stamped; the body is left alone so the shape stays readable.
 */
type TicketProps = IconProps<keyof typeof animations>;

const DASH_TRANSITION = { duration: 0.3, ease: 'easeInOut' } as const;

const animations = {
  default: {
    body: {},
    dash1: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { ...DASH_TRANSITION, delay: 0 },
      },
    },
    dash2: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { ...DASH_TRANSITION, delay: 0.08 },
      },
    },
    dash3: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { ...DASH_TRANSITION, delay: 0.16 },
      },
    },
  } satisfies Record<string, Variants>,
  'default-loop': {
    body: {},
    dash1: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0, repeat: Infinity, repeatDelay: 0.4 },
      },
    },
    dash2: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.12, repeat: Infinity, repeatDelay: 0.4 },
      },
    },
    dash3: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [1, 0, 1],
        opacity: [1, 0.3, 1],
        transition: { duration: 0.6, ease: 'easeInOut', delay: 0.24, repeat: Infinity, repeatDelay: 0.4 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: TicketProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
        variants={variants.body}
        initial="initial"
        animate={controls}
      />
      <motion.path d="M13 5v2" variants={variants.dash1} initial="initial" animate={controls} />
      <motion.path d="M13 11v2" variants={variants.dash2} initial="initial" animate={controls} />
      <motion.path d="M13 17v2" variants={variants.dash3} initial="initial" animate={controls} />
    </motion.svg>
  );
}

function Ticket(props: TicketProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Ticket,
  Ticket as TicketIcon,
  type TicketProps,
  type TicketProps as TicketIconProps,
};
