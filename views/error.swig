<!doctype html>
<html>
<head>
	<title></title>
	<meta charset="utf-8">
	<meta name="viewport" content="initial-scale=1">
	<link rel="stylesheet" type="text/css" href="/assets/css/site.css">
</head>
<body>
	<h1>{{status}}: {{ message }}</h1>
	{% if stack %}
	<pre>{{ stack }}</pre>
	{% endif %}
</body>
</html>
