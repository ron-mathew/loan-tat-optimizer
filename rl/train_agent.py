"""
rl/train_agent.py
-----------------
Trains the PPO agent on LoanSanctionEnvV2 (ML-integrated environment).

Run:
    python rl/train_agent.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env

from ml.predictor      import DelayPredictor
from rl.environment    import LoanSanctionEnvV2
from config import (
    RAW_DATA_PATH, PPO_SAVE_PATH,
    N_ENVS, TOTAL_TIMESTEPS, RL_DIR, RANDOM_STATE
)


def train_ppo():
    print("=" * 60)
    print("  PPO V2 Training — ML-Integrated Loan TAT Optimizer")
    print("=" * 60)

    # ── Load data & predictor ──
    df        = pd.read_csv(RAW_DATA_PATH)
    predictor = DelayPredictor()
    print(f"\n  Dataset loaded      : {len(df)} records")
    print(f"  ML model loaded     : {predictor.model.__class__.__name__}")

    # ── Create vectorised environment ──
    def make_env():
        return LoanSanctionEnvV2(df, predictor.predict)

    vec_env = make_vec_env(make_env, n_envs=N_ENVS, seed=RANDOM_STATE)
    print(f"  Parallel envs       : {N_ENVS}")

    # ── Build PPO model ──
    model = PPO(
        policy        = "MlpPolicy",
        env           = vec_env,
        verbose       = 1,
        learning_rate = 3e-4,
        n_steps       = 2048,
        batch_size    = 64,
        gamma         = 0.99,
        ent_coef      = 0.01,   # encourages exploration
        clip_range    = 0.2,
        seed          = RANDOM_STATE,
    )

    print(f"\n  Total timesteps     : {TOTAL_TIMESTEPS:,}")
    print("  Training...\n")
    model.learn(total_timesteps=TOTAL_TIMESTEPS)

    # ── Save ──
    os.makedirs(RL_DIR, exist_ok=True)
    model.save(PPO_SAVE_PATH)
    print(f"\n  ✅ PPO V2 saved → {PPO_SAVE_PATH}.zip")

    return model


if __name__ == "__main__":
    train_ppo()
