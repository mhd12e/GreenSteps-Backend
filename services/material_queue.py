import threading
import queue
import logging
import time
from uuid import UUID
from services.material_service import process_material_background

logger = logging.getLogger(__name__)

# Create a FIFO queue
material_queue = queue.Queue()
stop_event = threading.Event()

def worker():
    """
    Worker thread that processes materials from the queue one by one.
    """
    logger.info("Material AI Worker Thread started.")
    while not stop_event.is_set():
        try:
            # excessive blocking here is fine, it's a daemon thread
            # timeout allows checking stop_event periodically
            material_id = material_queue.get(timeout=1)
            
            try:
                logger.info(f"Worker picked up material: {material_id}")
                process_material_background(material_id)
            except Exception as e:
                logger.error(f"Error in worker thread for material {material_id}: {e}")
            finally:
                material_queue.task_done()
                
        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"Unexpected error in worker loop: {e}")
            time.sleep(1) # Prevent tight loop on crash

def start_worker():
    t = threading.Thread(target=worker, daemon=True, name="MaterialWorker")
    t.start()
    return t

def stop_worker():
    stop_event.set()

def enqueue_material(material_id: UUID):
    material_queue.put(material_id)
    logger.info(f"Enqueued material {material_id} for processing. Queue size: {material_queue.qsize()}")
