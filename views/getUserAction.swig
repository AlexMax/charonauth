{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{{ macros.usernav(username, 'actions', true) }}
<p>
<dl class="dl-horizontal">
	<dt>User:</dt>
	<dd>{{ action.user.username }}</dd>
	<dt>Date:</dt>
	<dd>{{ action.createdAt|date }}</dd>
	<dt>IP Address:</dt>
	<dd>{{ action.ip|ip }}</dd>
	<dt>Action:</dt>
	<dd>{{ action.getPrettyType() }}</dd>
	{% if action.whom and action.whom.id != action.user.id %}
	<dt>Action target:</dt>
	<dd>{{ action.whom.username }}</dd>
	{% endif %}
	{% if action.before %}
	<dt>Before:</dt>
	<dd><pre>{{ action.before }}</pre></dd>
	{% endif %}
	{% if action.after %}
	<dt>After:</dt>
	<dd><pre>{{ action.after }}</pre></dd>
	{% endif %}
</dl>
</p>
{% endblock %}
