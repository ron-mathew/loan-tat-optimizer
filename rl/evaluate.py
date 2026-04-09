"""
rl/evaluate.py
--------------
Evaluates the trained PPO V2 agent:
  1. Mean reward: PPO vs Random Agent
  2. Action distribution by risk level
  3. Average episode length (TAT proxy)

Run:
    python rl/evaluate.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import collections
import numpy as np
import pandas as pd

from stable_baselines3 import PPO

from ml.predictor   import DelayPredictor
from rl.environment import LoanSanctionEnvV2
from config import (
    RAW_DATA_PATH, PPO_SAVE_PATH,
    ACTION_NAMES, RISK_LABELS
)


# ───────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────
def run_episode(env, model=None, deterministic=True):
    """Run one full episode. Returns (total_reward, steps_taken)."""
    obs, _ = env.reset()
    total_reward = 0.0
    steps = 0

    while True:
        if model:
            action, _ = model.predict(obs, deterministic=deterministic)
        else:
            action = env.action_space.sample()

        obs, reward, done, _, _ = env.step(int(action))
        total_reward += reward
        steps += 1
        if done:
            break

    return total_reward, steps


# ───────────────────────────────────────────────
# Main evaluation
# ───────────────────────────────────────────────
def evaluate(n_episodes: int = 30):
    df        = pd.read_csv(RAW_DATA_PATH)
    predictor = DelayPredictor()
    env       = LoanSanctionEnvV2(df, predictor.predict)

    ppo_path = PPO_SAVE_PATH + ".zip"
    if not os.path.exists(ppo_path):
        raise FileNotFoundError(
            f"PPO model not found at {ppo_path}.\n"
            "Run  python rl/train_agent.py  first."
        )

    model = PPO.load(PPO_SAVE_PATH, env=env)

    # ── 1. Reward comparison ──────────────────────────────────────────
    print("=" * 60)
    print("  EVALUATION — PPO V2 vs Random Agent")
    print("=" * 60)

    ppo_rewards, ppo_steps       = [], []
    random_rewards, random_steps = [], []

    for _ in range(n_episodes):
        r, s = run_episode(env, model=model)
        ppo_rewards.append(r); ppo_steps.append(s)

        r, s = run_episode(env, model=None)
        random_rewards.append(r); random_steps.append(s)

    print(f"\n  Episodes evaluated : {n_episodes}")
    print(f"\n  {'Agent':<22} {'Mean Reward':>12} {'Std':>8} {'Mean Steps':>12}")
    print("  " + "-" * 58)
    print(
        f"  {'PPO V2 (ML-aware)':<22} "
        f"{np.mean(ppo_rewards):>12.2f} "
        f"{np.std(ppo_rewards):>8.2f} "
        f"{np.mean(ppo_steps):>12.1f}"
    )
    print(
        f"  {'Random Agent':<22} "
        f"{np.mean(random_rewards):>12.2f} "
        f"{np.std(random_rewards):>8.2f} "
        f"{np.mean(random_steps):>12.1f}"
    )

    improvement = np.mean(ppo_rewards) - np.mean(random_rewards)
    print(f"\n  PPO improvement over random: {improvement:+.2f} reward points")

    # ── 2. Action distribution by risk level ─────────────────────────
    print("\n" + "=" * 60)
    print("  ACTION DISTRIBUTION BY RISK LEVEL")
    print("=" * 60)

    action_by_risk = {0: [], 1: [], 2: []}
    obs, _ = env.reset()

    for _ in range(1000):
        action, _ = model.predict(obs, deterministic=True)
        risk_level = int(obs[2])
        action_by_risk[risk_level].append(int(action))
        obs, _, done, _, _ = env.step(int(action))
        if done:
            obs, _ = env.reset()

    for risk, actions in action_by_risk.items():
        if not actions:
            continue
        counter = collections.Counter(actions)
        total   = len(actions)
        print(f"\n  Risk: {RISK_LABELS[risk]}  ({total} steps)")
        for act in range(5):
            cnt  = counter.get(act, 0)
            bar  = "█" * int(30 * cnt / total)
            print(f"    {ACTION_NAMES[act]:<22} {bar:<30} {100*cnt/total:5.1f}%")

    # ── 3. TAT summary ────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  TURNAROUND TIME PROXY (Episode Length)")
    print("=" * 60)
    print(f"  PPO V2  avg steps : {np.mean(ppo_steps):.1f}  (lower = faster loans)")
    print(f"  Random  avg steps : {np.mean(random_steps):.1f}")
    tat_reduction = np.mean(random_steps) - np.mean(ppo_steps)
    print(f"  TAT reduction     : {tat_reduction:+.1f} steps on average")


if __name__ == "__main__":
    evaluate()
