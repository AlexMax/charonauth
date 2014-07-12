{#
 # Returns a URL with the gravatar hash and combination of d and f to
 # reflect the user's desired gravatar style.
 #}
{% macro gravatar(hash, override, def) %}//www.gravatar.com/avatar/{% if override %}{{ hash }}?d={{ override }}&f=y{% else %}{{ hash }}?d={{ def }}{% endif %}{% endmacro %}
