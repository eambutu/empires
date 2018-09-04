import argparse, os

parser = argparse.ArgumentParser(description='Convert gzipped json to pretty json.')
parser.add_argument('input_path', type=str)

args = parser.parse_args()

import gzip
import json
with gzip.open(args.input_path, 'rb') as f:
    j = json.loads(f.read())

output_file = args.input_path.rsplit('.', 1)[0]
with open(output_file, 'w+') as f:
	json.dump(j, f, indent=2)
