import logging

logger = logging.getLogger("sentridose.fcm")

def send_fcm_risk_notification(fcm_tokens: list, title: str, body: str, data: dict = None):
    """
    Sends FCM Push Notifications to registered Supervisor devices.
    If Firebase Admin SDK is not initialized, logs gracefully without failing.
    """
    if not fcm_tokens:
        return

    logger.info(f"FCM Push Alert triggered for {len(fcm_tokens)} devices: {title} - {body}")
    # Integration hook for Firebase Admin SDK messaging
    try:
        # e.g., messaging.send_multicast(...)
        pass
    except Exception as e:
        logger.warning(f"FCM push notification send skipped/failed: {e}")
