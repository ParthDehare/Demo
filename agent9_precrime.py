class PreCrimeAgent:
    def __init__(self):
        self.state_bins = [
            {"label": "LOW", "min": 0, "max": 39, "default_score": 20},
            {"label": "MEDIUM", "min": 40, "max": 69, "default_score": 55},
            {"label": "HIGH", "min": 70, "max": 100, "default_score": 85}
        ]

    def _get_state(self, score):
        for bin in self.state_bins:
            if bin["min"] <= score <= bin["max"]:
                return bin["label"]
        return "LOW"
    
    def _get_default_score(self, state):
        for bin in self.state_bins:
            if bin["label"] == state:
                return bin["default_score"]
        return 20

    def predict(self, emp_id: str, scores: list[int]) -> dict:
        if not scores:
            return {
                "emp_id": emp_id,
                "predicted_state": "LOW",
                "predicted_score": 0,
                "confidence": 0.0,
                "reason": "No historical data available for prediction."
            }
            
        states = [self._get_state(s) for s in scores]
        
        if len(states) < 2:
            current_state = states[0]
            return {
                "emp_id": emp_id,
                "predicted_state": current_state,
                "predicted_score": self._get_default_score(current_state),
                "confidence": 0.5,
                "reason": "Not enough history to build transition matrix; defaulting to current state."
            }

        # Build transition matrix
        transitions = {}
        for i in range(len(states) - 1):
            current = states[i]
            next_state = states[i+1]
            if current not in transitions:
                transitions[current] = {}
            if next_state not in transitions[current]:
                transitions[current][next_state] = 0
            transitions[current][next_state] += 1

        last_state = states[-1]
        
        # If we have never transitioned from the last state, we can't predict
        if last_state not in transitions or not transitions[last_state]:
            return {
                "emp_id": emp_id,
                "predicted_state": last_state,
                "predicted_score": self._get_default_score(last_state),
                "confidence": 0.5,
                "reason": f"No observed transitions from {last_state}; defaulting to current state."
            }

        # Find most likely next state
        possible_next = transitions[last_state]
        total_transitions_from_last = sum(possible_next.values())
        
        predicted_state = max(possible_next, key=possible_next.get)
        transition_count = possible_next[predicted_state]
        confidence = round(transition_count / total_transitions_from_last, 2)
        
        return {
            "emp_id": emp_id,
            "predicted_state": predicted_state,
            "predicted_score": self._get_default_score(predicted_state),
            "confidence": confidence,
            "reason": f"Employee has transitioned from {last_state} to {predicted_state} in {transition_count} of last {total_transitions_from_last} observations from this state."
        }
