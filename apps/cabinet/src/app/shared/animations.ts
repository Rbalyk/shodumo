import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';

/** Subtle fade + lift used on page sections, the form and the live preview. */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(6px)' }),
    animate('220ms cubic-bezier(0.22, 0.61, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
  ]),
]);

/**
 * Staggered fade for lists/grids — attach to the container; each direct child
 * with the matching structural directive (`@for`) fades in sequentially.
 */
export const fadeStagger = trigger('fadeStagger', [
  transition(':enter, * => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        stagger(45, [
          animate('220ms cubic-bezier(0.22, 0.61, 0.36, 1)', style({ opacity: 1, transform: 'none' })),
        ]),
      ],
      { optional: true },
    ),
  ]),
]);
