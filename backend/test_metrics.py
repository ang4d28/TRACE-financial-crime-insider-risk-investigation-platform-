import requests

r = requests.get('http://localhost:8000/metrics', timeout=30)
data = r.json()

print(f"Precision: {data['baseline']['precision']:.1%}")
print(f"Recall: {data['baseline']['recall']:.1%}")
print(f"F1: {data['baseline']['f1_score']:.1%}")
print(f"Accuracy: {data['baseline']['accuracy']:.1%}")
print(f"FPR: {data['baseline']['false_positive_rate']:.1%}")
print()
print(f"TP: {data['baseline']['true_positives']}")
print(f"FP: {data['baseline']['false_positives']}")
print(f"TN: {data['baseline']['true_negatives']}")
print(f"FN: {data['baseline']['false_negatives']}")
print()
print(f"Cases with calls: {data['with_calls']['cases_with_calls']}")
print(f"FP resolved: {data['with_calls']['false_positives_resolved']}")
print(f"FP reduction: {data['with_calls']['fp_reduction_percent']:.1f}%")
