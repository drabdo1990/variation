import { useCallback, useState } from "react";
import { BOARD_LANES } from "../../data/vocab.js";
import { useAppState, useDispatch } from "../../store/context.js";

const laneIndex = (id) => BOARD_LANES.findIndex((lane) => lane.id === id);

/**
 * Board behaviour. Tasks live in the store — this hook only owns the
 * transient drag state. Both ways of moving a card (drop, or the keyboard
 * arrows) dispatch the same `task/move` action, so lane changes are logged
 * and `completedAt` is stamped in one place.
 */
export function useBoard() {
  const { tasks } = useAppState();
  const dispatch = useDispatch();
  const [draggingId, setDraggingId] = useState(null);

  const moveTo = useCallback(
    (id, lane) => dispatch({ type: "task/move", id, lane }),
    [dispatch],
  );

  /** Step a task one lane left or right; no-ops at the ends. */
  const step = useCallback(
    (id, direction) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const next = laneIndex(task.lane) + direction;
      if (next < 0 || next >= BOARD_LANES.length) return;
      dispatch({ type: "task/move", id, lane: BOARD_LANES[next].id });
    },
    [tasks, dispatch],
  );

  const tasksIn = useCallback(
    (laneId) => tasks.filter((task) => task.lane === laneId),
    [tasks],
  );

  return { tasks, tasksIn, moveTo, step, draggingId, setDraggingId };
}
