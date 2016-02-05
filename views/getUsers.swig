{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{% set operator = {'OWNER': true, 'MASTER': true, 'OP': true} %}
{% if operator.hasOwnProperty(session.user.access) %}
<ul class="nav nav-tabs" role="tablist">
	<li class="{% if filter == 'active' %}active{% endif %}">
		<a href="/users?f=active">Active</a>
	</li>
	<li class="{% if filter == 'unverified' %}active{% endif %}">
		<a href="/users?f=unverified">Unverified</a>
	</li>
	<li class="{% if filter == 'inactive' %}active{% endif %}">
		<a href="/users?f=inactive">Inactive</a>
	</li>
</ul>
{% endif %}

<h2>User Directory</h2>
{% if users %}
<table class="table">
	<thead>
		<tr>
			<th>Country</th>
			<th>Gravatar</th>
			<th>Username</th>
			<th>Clan</th>
			<th>Last Seen</th>
	</thead>
	<tbody>
		{% for user in users %}
		<tr>
			<td><img height="80" src="/assets/svg/{{ user.Profile.getFlag() }}.svg" alt="{{ user.Profile.getCountry() }}"></td>
			<td><img src="{{ macros.gravatar(user.getGravatar(), user.Profile.gravatar, 'monsterid') }}" alt="{{ user.Profile.username }}"></td>
			<td><a href="/users/{{ user.username }}">{{ user.Profile.clantag }}{{ user.Profile.username }}</a></td>
			<td>{{ user.Profile.clan }}</td>
			<td>{{ user.seen }}</td>
		</tr>
		{% endfor %}
	</tbody>
</table>
{{ macros.paginator(pinfo) }}
{% else %}
<p>No users found.</p>
{% endif %}
{% endblock %}
