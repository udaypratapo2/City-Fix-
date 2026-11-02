import server

client = server.app.test_client()

# 1. Test frontend serve
r_front = client.get('/')
assert r_front.status_code == 200 and b'CityFix' in r_front.data, 'Frontend serve failed'
print('Test 1 Passed: Frontend SPA served correctly.')

# 2. Test predictions (English + Hinglish)
queries = [
    ('deep pothole on main road', 'pothole'),
    ('broken water pipe flooding', 'water_leakage'),
    ('street lights are out and dark', 'streetlight'),
    ('trash and garbage everywhere', 'garbage'),
    ('nala jaam ho gaya monsoon flooding', 'drainage'),
    ('stray dogs attacking children near school', 'stray_animals'),
    ('kooda nahi uthaya teen din se', 'garbage'),
]
for q, expected in queries:
    r = client.post('/api/predict', json={'description': q})
    assert r.status_code == 200, f'Predict failed for {q}'
    body = r.get_json()
    print(f'Predict "{q}" -> {body["category"]} (Conf: {body["confidence"]}, Dept: {body["department"]}, Prio: {body["suggested_priority"]})')
    assert body['category'] == expected, f'Expected {expected}, got {body["category"]} for "{q}"'

# 3. Test report creation (India)
new_r = client.post('/api/reports', json={
    'issue_description': 'Critical water main rupture near government school in Karol Bagh',
    'location_street_address': 'Ajmal Khan Road',
    'location_city': 'New Delhi',
    'location_state': 'Delhi',
    'location_postal_code': '110005',
    'location_country': 'India',
    'latitude': 28.6510,
    'longitude': 77.1900,
    'resident_name': 'Priya Sharma'
})
assert new_r.status_code == 201
report = new_r.get_json()
report_id = report['report_id']
assert report['location_country'] == 'India'
print(f'Test 3 Passed: Report created with ID {report_id} routed to {report["municipal_department"]}')

# 4. Test upvote
up = client.post(f'/api/reports/{report_id}/upvote')
assert up.status_code == 200 and up.get_json()['citizen_reports_count'] == 2
print('Test 4 Passed: Upvote incremented citizen count.')

# 5. Test status update
patch = client.patch(f'/api/reports/{report_id}', json={'issue_status': 'resolved', 'resolution_notes': 'Jal Board crew repaired the pipeline'})
assert patch.status_code == 200 and patch.get_json()['issue_status'] == 'resolved'
print('Test 5 Passed: Status updated to resolved.')

# 6. Test stats
st = client.get('/api/stats')
assert st.status_code == 200 and st.get_json()['total_reports'] > 0
stats = st.get_json()
print(f'Test 6 Passed: Stats aggregated ({stats["total_reports"]} reports, {stats["resolution_rate"]}% resolved)')

# 7. Config / maps (keys stay server-side)
cfg = client.get('/api/config')
assert cfg.status_code == 200
config = cfg.get_json()
assert config['region'] == 'IN'
assert config['map']['lat'] > 6 and config['map']['lng'] > 68
print(f'Test 7 Passed: India map config ({config["map"]["provider"]}, key_configured={config["map"]["key_configured"]})')

health = client.get('/api/health').get_json()
assert health['model_loaded'] is True
print(f'Test 8 Passed: Health check model_loaded, accuracy={health.get("model_accuracy")}')
print('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!')
