<!doctype html>
<html>
<head>
	<title>{% block title %}{% endblock %}</title>
	<meta charset="utf-8">
	<meta name="viewport" content="initial-scale=1">
	<link rel="stylesheet" type="text/css" href="/assets/css/site.css">
</head>
<body>
	{% include 'header.swig' %}
	<div class="container">
		{% block body %}{% endblock %}
	</div>
</body>
</html>
