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
 * `credit-card`, and the sidebar entry needed the same hover behaviour as its
 * neighbours. Geometry is lucide's `credit-card` (ISC), so the glyph is
 * unchanged.
 *
 * The magnetic stripe redraws left to right, reading as a card being swiped;
 * the card outline holds still so the shape stays readable.
 */
type CreditCardProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    card: {},
    stripe: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1],
        opacity: [0.3, 1],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
  'default-loop': {
    card: {},
    stripe: {
      initial: { pathLength: 1, opacity: 1 },
      animate: {
        pathLength: [0, 1, 1],
        opacity: [0.3, 1, 1],
        transition: { duration: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: CreditCardProps) {
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
      <motion.rect
        width={20}
        height={14}
        x={2}
        y={5}
        rx={2}
        variants={variants.card}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1={2}
        x2={22}
        y1={10}
        y2={10}
        variants={variants.stripe}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function CreditCard(props: CreditCardProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  CreditCard,
  CreditCard as CreditCardIcon,
  type CreditCardProps,
  type CreditCardProps as CreditCardIconProps,
};
