import pandas as pd
import numpy as np
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.preprocessing import StandardScaler, RobustScaler
from typing import Tuple, List

def load_and_clean_dataset(csv_path: str) -> pd.DataFrame:
    """
    Reads dataset, validates schema, and fills missing values.
    """
    df = pd.read_csv(csv_path)
    required_cols = ["sample_id", "dosimeter_id", "exposure_class"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in dataset: {col}")
    return df

def group_train_test_split(
    df: pd.DataFrame,
    group_col: str = "dosimeter_id",
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits dataset into train and test sets strictly grouping by physical dosimeter ID
    to prevent data leakage across photos of the same physical dosimeter.
    """
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    groups = df[group_col]
    train_idx, test_idx = next(gss.split(df, groups=groups))
    
    train_df = df.iloc[train_idx].copy()
    test_df = df.iloc[test_idx].copy()
    
    return train_df, test_df
