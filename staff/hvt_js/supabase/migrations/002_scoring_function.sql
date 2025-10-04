-- HVT Climbing Tracker - Scoring Function
-- Implements the scoring and ranking logic (FR-018, FR-019, FR-020, FR-021)

CREATE OR REPLACE FUNCTION calculate_climber_score(
  p_session_id UUID,
  p_climber_id UUID
)
RETURNS TABLE (
  total_points INTEGER,
  rank INTEGER
) AS $$
DECLARE
  v_total_points INTEGER;
  v_rank INTEGER;
BEGIN
  -- Calculate total points for the climber
  -- FR-018: Sum of all attempt points
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM attempts
  WHERE session_id = p_session_id
    AND climber_id = p_climber_id;

  -- Update session_climbers total_points
  UPDATE session_climbers
  SET total_points = v_total_points
  WHERE session_id = p_session_id
    AND climber_id = p_climber_id;

  -- Recalculate ranks for all climbers in the session
  -- FR-019: Rank by total points descending
  -- FR-020: Ties share the same rank with gap in numbering
  WITH ranked_climbers AS (
    SELECT
      id,
      RANK() OVER (ORDER BY total_points DESC) AS new_rank
    FROM session_climbers
    WHERE session_id = p_session_id
      AND total_points > 0  -- FR-021: Hide climbers with 0 points
  )
  UPDATE session_climbers sc
  SET rank = rc.new_rank
  FROM ranked_climbers rc
  WHERE sc.id = rc.id;

  -- Set rank to NULL for climbers with 0 points
  UPDATE session_climbers
  SET rank = NULL
  WHERE session_id = p_session_id
    AND total_points = 0;

  -- Return the calculated values
  SELECT sc.total_points, sc.rank
  INTO v_total_points, v_rank
  FROM session_climbers sc
  WHERE sc.session_id = p_session_id
    AND sc.climber_id = p_climber_id;

  RETURN QUERY SELECT v_total_points, v_rank;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically recalculate scores when attempts change
CREATE OR REPLACE FUNCTION recalculate_scores_on_attempt_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM calculate_climber_score(NEW.session_id, NEW.climber_id);
    RETURN NEW;
  -- Handle DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM calculate_climber_score(OLD.session_id, OLD.climber_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to attempts table
CREATE TRIGGER attempts_score_recalculation
  AFTER INSERT OR UPDATE OR DELETE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_scores_on_attempt_change();
