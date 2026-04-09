import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import numpy as np
import pandas as pd

import gymnasium as gym
from gymnasium import spaces

from config import (
    RAW_DATA_PATH, MAX_EPISODE_DAYS, SLA_THRESHOLD,
    ACTION_NAMES, RISK_LABELS, STAGE_NAMES
)


class LoanSanctionEnvV2(gym.Env):

    metadata = {"render_modes": ["human"]}

    def __init__(self, df: pd.DataFrame, ml_predict_fn):
        super().__init__()

        self.df            = df.reset_index(drop=True)
        self.ml_predict_fn = ml_predict_fn
        self.max_days      = MAX_EPISODE_DAYS

        self.action_space = spaces.Discrete(5)

        self.observation_space = spaces.Box(
            low  = np.array([1,  0, 0,  60,  5,  1], dtype=np.float32),
            high = np.array([8, 30, 2, 100, 30, 20], dtype=np.float32)
        )

        self.stage        = 1
        self.pending_days = 0
        self.risk         = 1
        self.docs         = 80.0
        self.load         = 15
        self.queue        = 10
        self.total_days   = 0
        self.done         = False

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)

        row = self.df.sample(1).iloc[0]

        self.stage        = 1
        self.pending_days = 0
        self.total_days   = 0
        self.done         = False

        self.risk  = self.ml_predict_fn(row)
        self.docs  = float(row["doc_complete_pct"])
        self.load  = int(row["officer_load"])
        self.queue = int(row["queue_position"])

        return self._get_state(), {}

    def step(self, action: int):
        reward = 0.0

        if action == 0:   # Wait
            self.pending_days += 1
            if self.risk == 2:
                reward -= 3.0
            elif self.risk == 1:
                reward -= 1.0
            else:
                reward += 0.5

        elif action == 1:  # Fast-track
            self.pending_days  = max(0, self.pending_days - 2)
            self.queue         = max(1, self.queue - 2)
            if self.pending_days > 5:
                reward += 3.0
            elif self.pending_days > 2:
                reward += 1.0
            else:
                reward -= 1.0

        elif action == 2:  # Reassign Officer
            self.load          = max(5, self.load - 5)
            self.pending_days  = max(0, self.pending_days - 1)
            if self.load > 22:
                reward += 4.0
            elif self.load > 15:
                reward += 2.0
            else:
                reward -= 1.0

        elif action == 3:  # Request Documents
            self.docs          = min(100, self.docs + 10)
            self.pending_days += 1
            if self.docs < 70:
                reward += 3.0
            elif self.docs < 80:
                reward += 1.0
            else:
                reward -= 2.0

        elif action == 4:  # Escalate
            self.stage  = min(8, self.stage + 1)
            if self.risk == 2 and self.pending_days > 5:
                reward += 5.0
            elif self.risk == 2:
                reward += 3.0
            elif self.risk == 1:
                reward += 1.0
            else:
                reward -= 1.0

        if random.random() < 0.3:
            self.stage = min(8, self.stage + 1)

        self.total_days += 1

        reward -= self.pending_days * 0.5

        if self.stage == 8:
            speed_bonus = max(5, 20 - self.total_days)
            reward     += speed_bonus

        if self.total_days > SLA_THRESHOLD:
            reward -= 5.0

        if self.stage == 8:
            self.done = True

        if self.total_days >= self.max_days:
            self.done  = True
            reward    -= 10.0

        return self._get_state(), float(reward), self.done, False, {}

    def _get_state(self) -> np.ndarray:
        return np.array([
            self.stage,
            self.pending_days,
            self.risk,
            self.docs,
            self.load,
            self.queue
        ], dtype=np.float32)

    def render(self, mode="human"):
        print(
            f"Stage: {STAGE_NAMES.get(self.stage, self.stage):30s} | "
            f"Risk: {RISK_LABELS.get(self.risk, '?'):6s} | "
            f"Pending: {self.pending_days:2d}d | "
            f"Docs: {self.docs:5.1f}% | "
            f"Load: {self.load:2d} | "
            f"Queue: {self.queue:2d} | "
            f"Day: {self.total_days}"
        )