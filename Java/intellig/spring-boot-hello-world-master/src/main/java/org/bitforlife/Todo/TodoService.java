package org.bitforlife.Todo;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;


@Service
public class TodoService {

    private final TodoRepository repository;

    public TodoService(TodoRepository repository) {
        this.repository = repository;
    }

    public Todo create(Todo todo) {

        LocalDateTime now = LocalDateTime.now();
        todo.setCreatedAt(now);
        todo.setUpdatedAt(now);
        return this.repository.save(todo);
    }

    public List<Todo> listAll() {
        return this.repository.findAll();
    }

    public Todo update(int id, Todo todo) throws Exception {
        if (!this.repository.existsById((int) id)) {
            throw new ResourceNotFoundException("Deu muito ruim pq nao encontrou o carinha no id");
        }

        LocalDateTime now = LocalDateTime.now();
        todo.setUpdatedAt(now);
        return this.repository.save(todo);
    }

    public boolean deleteById(int id) {
        if (!this.repository.existsById(id)) {
            return false;
        }

        this.repository.deleteById(id);
        return true;
    }


}
