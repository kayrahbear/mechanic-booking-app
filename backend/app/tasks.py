from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2, duration_pb2
import datetime
import json
import os
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Get configuration from environment variables with defaults
CLOUD_TASKS_LOCATION = os.environ.get("CLOUD_TASKS_LOCATION", "us-central1")
CLOUD_TASKS_QUEUE = os.environ.get("CLOUD_TASKS_QUEUE", "notification-tasks")
CLOUD_TASKS_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
WORKER_SERVICE_URL = os.environ.get("WORKER_SERVICE_URL")

# Initialize client
tasks_client = None

def get_tasks_client():
    """Get or create Cloud Tasks client."""
    global tasks_client
    if tasks_client is None:
        try:
            tasks_client = tasks_v2.CloudTasksClient()
        except Exception as e:
            logger.error(f"Failed to initialize Cloud Tasks client: {str(e)}")
    return tasks_client

def create_task_name(parent: str, queue: str, task_name: Optional[str] = None) -> str:
    """
    Create a fully qualified task name.
    
    Args:
        parent: The queue's parent resource name
        queue: The queue name
        task_name: Optional specific task name
        
    Returns:
        Fully qualified task name
    """
    if task_name:
        return f"{parent}/queues/{queue}/tasks/{task_name}"
    return f"{parent}/queues/{queue}/tasks"

def enqueue_notification_task(
    booking_id: str,
    payload: Dict[Any, Any],
    delay_seconds: int = 0
) -> str:
    """
    Enqueue a notification task to be processed by the worker.
    
    Args:
        booking_id: The ID of the booking
        payload: The notification payload (will be serialized to JSON)
        delay_seconds: Delay in seconds before the task is executed
        
    Returns:
        The name of the created task
    """
    client = get_tasks_client()
    if not client:
        logger.error("Cloud Tasks client not available, skipping notification")
        return ""
        
    if not CLOUD_TASKS_PROJECT:
        logger.error("GOOGLE_CLOUD_PROJECT not set, skipping notification")
        return ""
        
    if not WORKER_SERVICE_URL:
        logger.error("WORKER_SERVICE_URL not set, skipping notification")
        return ""
    
    # Construct the queue path
    parent = client.queue_path(
        CLOUD_TASKS_PROJECT, 
        CLOUD_TASKS_LOCATION, 
        CLOUD_TASKS_QUEUE
    )
    
    # Create task with HTTP target and authentication
    task = {
        'http_request': {
            'http_method': tasks_v2.HttpMethod.POST,
            'url': f"{WORKER_SERVICE_URL}/process-notification",
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'booking_id': booking_id,
                'notification_type': 'booking_created',
                'data': payload
            }).encode(),
            'oidc_token': {
                'service_account_email': "service-518102829592@gcp-sa-cloudtasks.iam.gserviceaccount.com"
            }
        }
    }
    
    # Add scheduling time if delayed
    if delay_seconds > 0:
        d = datetime.datetime.utcnow() + datetime.timedelta(seconds=delay_seconds)
        timestamp = timestamp_pb2.Timestamp()
        timestamp.FromDatetime(d)
        task['schedule_time'] = timestamp
    
    # Note: retry_config is configured on the queue, not individual tasks
    
    # Create the task (without specific name for now to avoid API issues)
    try:
        response = client.create_task(
            parent=parent,
            task=task
        )
        logger.info(f"Task {response.name} created successfully")
        return response.name
    except Exception as e:
        logger.error(f"Failed to create task: {str(e)}")
        return "" 