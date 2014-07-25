{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}

{% set actionTypes = {
	"login": "Logged into Website",
	"auth": "Server Authentication"
} %}

{{ macros.usernav(username, 'actions', true) }}
{% if actions %}
<table class="table">
	<thead>
		<tr>
			<th>Date and Time</th>
			<th>Action</th>
			<th>IP Address</th>
	</thead>
	<tbody>
		{% for action in actions %}
		<tr>
			<td>{{ action.createdAt|date('Y-m-d H:i:s') }}</td>
			<td>{{ actionTypes[action.type] }}</td>
			<td>{{ action.ip|ip }}</td>
		</tr>
		{% endfor %}
	</tbody>
</table>
<p>
	Note that the Authentication IP Address is for the server the user
	authenticated on, as the server cannot be trusted to report the user's IP
	address accurately.
</p>
{% else %}
<p>No actions found.</p>
{% endif %}
{% endblock %}
