from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import datetime
import requests
import json

app = Flask(__name__)
app.jinja_env.auto_reload = True
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'  # Replace with your database URI
db = SQLAlchemy(app)

socketio = SocketIO(app)  # Import the SocketIO class and create an instance

class Session(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  created_at = db.Column(db.String(100), nullable=False)
  session_name = db.Column(db.String(100), nullable=False)
  session_description = db.Column(db.String(100))
      
class Coordinates(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
  type = db.Column(db.String(100), nullable=False)
  latitude = db.Column(db.Float, nullable=False)
  longitude = db.Column(db.Float, nullable=False)
  altitude = db.Column(db.Float, nullable=False)

class SondehubSimulations(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
  name = db.Column(db.String(100), nullable=False, unique=True)
  launch_latitude = db.Column(db.Float, nullable=False)
  launch_longitude = db.Column(db.Float, nullable=False)
  launch_datetime = db.Column(db.String(100), nullable=False)
  launch_altitude = db.Column(db.Float, nullable=False)
  ascent_rate = db.Column(db.Float, nullable=False)
  burst_altitude = db.Column(db.Float, nullable=False)
  descent_rate = db.Column(db.Float, nullable=False)
  prediction = db.Column(db.JSON, nullable=False)

@app.route('/')
def index():
  return render_template('index.html')

@app.route('/new_session', methods=['POST'])
def new_session():
  try:
    new_session = request.get_json()
    session = Session(created_at=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), session_name=new_session['session_name'], session_description=new_session['session_description'])
    db.session.add(session)
    db.session.commit()
  
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  
  socketio.emit('new_session')
  
  return jsonify({"status": "success"})

@app.route('/get_sessions', methods=['GET'])
def get_sessions():
  try:
    data = Session.query.all()
    if not data:
      return jsonify({"status": "error", "message": "No sessions found"})
    data = [{"id": i.id, "created_at": i.created_at, "session_name": i.session_name, "session_description": i.session_description} for i in data]
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  return jsonify({"status": "success", "data": data})

@app.route('/add_coordinates', methods=['POST'])
def add_coordinates():
  try:
    data = request.get_json()
    coordinates = Coordinates(session_id=data['session_id'], type=data['type'], latitude=data['latitude'], longitude=data['longitude'], altitude=data['altitude'])
    db.session.add(coordinates)
    db.session.commit()
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  
  # Emit the coordinates to all connected clients
  socketio.emit('new_coordinates', data)
  
  return jsonify({"status": "success"})

@app.route('/get_coordinates', methods=['GET'])
def get_coordinates():
  try:
    session_id = request.args.get('session_id')
    type = request.args.get('type')
    data = Coordinates.query.filter_by(session_id=session_id, type=type).all()
    if not data:
      return jsonify({"status": "error", "message": "No coordinates found"})
    data = [{"latitude": i.latitude, "longitude": i.longitude} for i in data]
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  return jsonify({"status": "success", "data": data})

@app.route('/run_sondehub_simulation', methods=['GET'])
def run_sondehub_simulation():
  params = request.args
  
  # Validate the parameters
  if not 0 <= float(params.get('launchAltitude')) <= 100000:
    return jsonify({"status": "error", "message": "Invalid altitude"})
  
  if not 2 <= float(params.get('ascentSpeed')) <= 20:
    return jsonify({"status": "error", "message": "Invalid ascent rate"})

  if not 2 <= float(params.get('descentSpeed')) <= 20:
    return jsonify({"status": "error", "message": "Invalid descent rate"})
  
  if not 500 <= float(params.get('burstAltitude')) <= 100000:
    return jsonify({"status": "error", "message": "Invalid burst altitude"})
  
  # If the burst altitude is the same as the launch altitude, add 10 meters
  # as this means that we only care about the descent
  if params.get('burstAltitude') == params.get('launchAltitude'):
    burst_altitude == str(float(params.get('launchAltitude')) + 10)
    type = "descent_only"
  else:
    burst_altitude = params.get('burstAltitude')
    type = "full_simulation"
  
  launch_datetime = datetime.datetime.strptime(params.get('startDate'), "%Y-%m-%dT%H:%M")
  launch_datetime -= datetime.timedelta(hours=2)
  launch_datetime = launch_datetime.isoformat(timespec='seconds') + "Z"
  
  url = "https://api.v2.sondehub.org/tawhiri"
  payload = {
      "launch_latitude": params.get('latitude'),
      "launch_longitude": params.get('longitude'),
      "launch_datetime": launch_datetime,
      "launch_altitude": params.get('launchAltitude'),
      "ascent_rate": params.get('ascentSpeed'),
      "burst_altitude": burst_altitude,
      "descent_rate": params.get('descentSpeed'),
  }

  # Make the request to the Sondehub API
  response = requests.get(url, params=payload)
  data = response.json()
  if response.status_code != 200:
    return jsonify({"status": "error", "message": data})

  # Parse the response to get the coordinates
  prediction_coordinates = {"coordinates": []}
  for stage in data["prediction"]:
    trajectory = stage["trajectory"]
    for point in trajectory:
      latitude = point["latitude"]
      longitude = point["longitude"]
      altitude = point["altitude"]
      prediction_coordinates["coordinates"].append((latitude, longitude, altitude))

  # Save the simulation to the database
  try:
    simulation = SondehubSimulations(session_id=params.get('session_id'), name=params.get('simulationName'), launch_latitude=params.get('latitude'), launch_longitude=params.get('longitude'), launch_datetime=launch_datetime, launch_altitude=params.get('launchAltitude'), ascent_rate=params.get('ascentSpeed'), burst_altitude=params.get('burstAltitude'), descent_rate=params.get('descentSpeed'), prediction=prediction_coordinates)
    db.session.add(simulation)
    db.session.commit()
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  
  # Emit the simulation to all connected clients
  socketio.emit('new_simulation')
  
  return jsonify({"status": "success"})
  
@app.route('/get_simulations', methods=['GET'])
def get_simulations():
  try:
    session_id = request.args.get('session_id')
    data = SondehubSimulations.query.filter_by(session_id=session_id).all()
    if not data:
      return jsonify({"status": "error", "message": "No simulations found"})
    
    data = [{"name": i.name, "launch_latitude": i.launch_latitude, "launch_longitude": i.launch_longitude, "launch_datetime": i.launch_datetime, "launch_altitude": i.launch_altitude, "ascent_rate": i.ascent_rate, "burst_altitude": i.burst_altitude, "descent_rate": i.descent_rate, "prediction": i.prediction} for i in data]
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)})
  return jsonify({"status": "success", "data": data})

if __name__ == '__main__':
  with app.app_context():
    
    db.create_all()
  socketio.run(app, debug=True)
